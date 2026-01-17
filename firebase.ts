
import { UserProfile, Contact, EmergencyRecord, LocationUpdate, EmergencyStatus } from './types';

const STORAGE_KEY = 'SAFE_VOICE_DB';

const getDB = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : { users: {}, contacts: [], emergencies: [], locations: [] };
};

const saveDB = (db: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  // Dispatch a storage event so other "tabs" or views can listen for changes in real-time
  window.dispatchEvent(new Event('storage_update'));
};

export const firebaseService = {
  // AUTHENTICATION
  getCurrentUser: (): UserProfile | null => {
    const userJson = localStorage.getItem('SAFE_VOICE_SESSION');
    return userJson ? JSON.parse(userJson) : null;
  },

  signUp: async (name: string, email: string, phone: string): Promise<UserProfile> => {
    const db = getDB();
    const emailKey = email.toLowerCase();
    if (db.users[emailKey]) {
      throw new Error("Account with this email already exists.");
    }
    const user: UserProfile = {
      userId: 'u_' + Math.random().toString(36).substr(2, 9),
      name,
      email: emailKey,
      phone,
      emergencyKeyword: 'HELP',
      isArmed: false,
      createdAt: Date.now()
    };
    db.users[emailKey] = user;
    saveDB(db);
    localStorage.setItem('SAFE_VOICE_SESSION', JSON.stringify(user));
    return user;
  },

  login: async (email: string): Promise<UserProfile> => {
    const db = getDB();
    const emailKey = email.toLowerCase();
    const user = db.users[emailKey] as UserProfile;
    if (!user) {
      throw new Error("Invalid credentials. Operative not found.");
    }
    localStorage.setItem('SAFE_VOICE_SESSION', JSON.stringify(user));
    return user;
  },

  logout: () => {
    localStorage.removeItem('SAFE_VOICE_SESSION');
  },

  updateProfile: (userId: string, updates: Partial<UserProfile>) => {
    const db = getDB();
    const emailKey = Object.keys(db.users).find(key => db.users[key].userId === userId);
    if (emailKey && db.users[emailKey]) {
      db.users[emailKey] = { ...db.users[emailKey], ...updates };
      saveDB(db);
      localStorage.setItem('SAFE_VOICE_SESSION', JSON.stringify(db.users[emailKey]));
    }
  },

  // TRUSTED CONTACTS
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

  // EMERGENCY OPERATIONS
  triggerEmergency: (userId: string): string => {
    const db = getDB();
    // Check if there's already an active one to avoid duplicates
    const existing = db.emergencies.find((e: any) => e.userId === userId && e.status === EmergencyStatus.ACTIVE);
    if (existing) return existing.emergencyId;

    const emergencyId = 'e_' + Date.now();
    const record: EmergencyRecord = {
      emergencyId,
      userId,
      status: EmergencyStatus.ACTIVE,
      triggeredAt: Date.now()
    };
    db.emergencies.push(record);
    saveDB(db);
    
    // REAL-TIME SMS SIMULATION
    const contacts = firebaseService.getContacts(userId);
    const user = Object.values(db.users).find((u: any) => u.userId === userId) as UserProfile;
    
    console.group(`%c[SMS GATEWAY] SOS DISPATCHED`, 'background: #D32F2F; color: white; padding: 4px; font-weight: bold;');
    contacts.forEach(c => {
      const message = `EMERGENCY ALERT: ${user?.name || 'A user'} has triggered an SOS. Live Tracking: https://safe-voice.app/track/${emergencyId}`;
      console.log(`%cTo: ${c.name} (${c.phone})\nMessage: ${message}`, 'color: #D32F2F');
    });
    console.groupEnd();

    return emergencyId;
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

  getActiveEmergency: (userId: string): EmergencyRecord | undefined => {
    return getDB().emergencies.find((e: EmergencyRecord) => e.userId === userId && e.status === EmergencyStatus.ACTIVE);
  },

  getAllActiveEmergencies: (): EmergencyRecord[] => {
    return getDB().emergencies.filter((e: EmergencyRecord) => e.status === EmergencyStatus.ACTIVE);
  },

  // LOCATION TRACKING
  pushLocation: (location: LocationUpdate) => {
    const db = getDB();
    db.locations.push(location);
    saveDB(db);
  },

  getEmergencyLocations: (emergencyId: string): LocationUpdate[] => {
    return getDB().locations.filter((l: LocationUpdate) => l.emergencyId === emergencyId);
  }
};
