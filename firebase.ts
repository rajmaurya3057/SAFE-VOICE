import { UserProfile, Contact, EmergencyRecord, LocationUpdate, EmergencyStatus } from './types';

const STORAGE_KEY = 'SAFE_VOICE_DB';

const getDB = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : { users: {}, contacts: [], emergencies: [], locations: [] };
};

const saveDB = (db: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  window.dispatchEvent(new Event('storage_update'));
  window.dispatchEvent(new CustomEvent('storage_sync', { detail: db }));
};

export const firebaseService = {
  getCurrentUser: (): UserProfile | null => {
    const userJson = localStorage.getItem('SAFE_VOICE_SESSION');
    return userJson ? JSON.parse(userJson) : null;
  },

  signUp: async (name: string, email: string, phone: string): Promise<UserProfile> => {
    const db = getDB();
    const emailKey = email.toLowerCase();
    if (db.users[emailKey]) throw new Error("Account exists.");
    const user: UserProfile = {
      userId: 'u_' + Math.random().toString(36).substr(2, 9),
      name, email: emailKey, phone,
      emergencyKeyword: 'HELP', isArmed: false, createdAt: Date.now()
    };
    db.users[emailKey] = user;
    saveDB(db);
    localStorage.setItem('SAFE_VOICE_SESSION', JSON.stringify(user));
    return user;
  },

  login: async (email: string): Promise<UserProfile> => {
    const db = getDB();
    const user = db.users[email.toLowerCase()] as UserProfile;
    if (!user) throw new Error("Access Denied.");
    localStorage.setItem('SAFE_VOICE_SESSION', JSON.stringify(user));
    return user;
  },

  logout: () => localStorage.removeItem('SAFE_VOICE_SESSION'),

  updateProfile: (userId: string, updates: Partial<UserProfile>) => {
    const db = getDB();
    const emailKey = Object.keys(db.users).find(key => db.users[key].userId === userId);
    if (emailKey) {
      db.users[emailKey] = { ...db.users[emailKey], ...updates };
      saveDB(db);
      localStorage.setItem('SAFE_VOICE_SESSION', JSON.stringify(db.users[emailKey]));
    }
  },

  getContacts: (userId: string): Contact[] => {
    return getDB().contacts.filter((c: Contact) => c.userId === userId);
  },

  addContact: (contact: Contact) => {
    const db = getDB();
    db.contacts.push(contact);
    saveDB(db);
  },

  deleteContact: (contactId: string) => {
    const db = getDB();
    db.contacts = db.contacts.filter((c: Contact) => c.contactId !== contactId);
    saveDB(db);
  },

  triggerEmergency: (userId: string): string => {
    const db = getDB();
    const emergencyId = 'e_' + Date.now();
    const record: EmergencyRecord = { emergencyId, userId, status: EmergencyStatus.ACTIVE, triggeredAt: Date.now() };
    db.emergencies.push(record);
    saveDB(db);
    
    const user = Object.values(db.users).find((u: any) => u.userId === userId) as UserProfile;
    const contacts = db.contacts.filter((c: Contact) => c.userId === userId);

    if (user) {
      // Trigger background alert sequence
      firebaseService.broadcastAlerts(user.name, emergencyId, contacts);
    }

    return emergencyId;
  },

  broadcastAlerts: async (userName: string, emergencyId: string, contacts: Contact[]) => {
    console.log(`[Twilio Dispatch] Targeting ${contacts.length} responders...`);
    try {
      const response = await fetch('/api/send-sms-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, emergencyId, contacts })
      });
      const data = await response.json();
      
      // Dispatch custom event for UI feedback on dispatch status
      window.dispatchEvent(new CustomEvent('twilio_dispatch_result', { detail: data }));
      return data;
    } catch (err) {
      console.error("[Twilio Dispatch] Network failure:", err);
      const errorData = { success: false, error: 'Network Connection Failed' };
      window.dispatchEvent(new CustomEvent('twilio_dispatch_result', { detail: errorData }));
      return errorData;
    }
  },

  resolveEmergency: (emergencyId: string) => {
    const db = getDB();
    const record = db.emergencies.find((e: EmergencyRecord) => e.emergencyId === emergencyId);
    if (record) {
      record.status = EmergencyStatus.SAFE;
      record.resolvedAt = Date.now();
      saveDB(db);
    }
  },

  getAllActiveEmergencies: (): EmergencyRecord[] => {
    return getDB().emergencies.filter((e: EmergencyRecord) => e.status === EmergencyStatus.ACTIVE);
  },

  getActiveEmergency: (userId: string): EmergencyRecord | undefined => {
    return getDB().emergencies.find((e: EmergencyRecord) => e.userId === userId && e.status === EmergencyStatus.ACTIVE);
  },

  getUserById: (userId: string): UserProfile | undefined => {
    const db = getDB();
    return Object.values(db.users).find((u: any) => u.userId === userId) as UserProfile;
  },

  pushLocation: (location: LocationUpdate) => {
    const db = getDB();
    db.locations.push(location);
    saveDB(db);
  },

  getEmergencyLocations: (emergencyId: string): LocationUpdate[] => {
    return getDB().locations.filter((l: LocationUpdate) => l.emergencyId === emergencyId);
  }
};