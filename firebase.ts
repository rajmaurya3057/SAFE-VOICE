
import { UserProfile, Contact, EmergencyRecord, LocationUpdate, EmergencyStatus } from './types';

const STORAGE_KEY = 'SAFE_VOICE_DB';

const getDB = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : { users: {}, contacts: [], emergencies: [], locations: [] };
};

const saveDB = (db: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
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

  // CONTACTS & MONITORING
  getContacts: (userId: string): Contact[] => {
    return getDB().contacts.filter((c: Contact) => c.userId === userId);
  },

  addContact: (contact: Contact) => {
    const db = getDB();
    db.contacts.push(contact);
    saveDB(db);
  },

  // Added missing deleteContact method to fix error in SettingsScreen.tsx
  deleteContact: (contactId: string) => {
    const db = getDB();
    db.contacts = db.contacts.filter((c: Contact) => c.contactId !== contactId);
    saveDB(db);
  },

  // EMERGENCY CORE
  triggerEmergency: (userId: string): string => {
    const db = getDB();
    const existing = db.emergencies.find((e: any) => e.userId === userId && e.status === EmergencyStatus.ACTIVE);
    if (existing) return existing.emergencyId;

    const emergencyId = 'e_' + Date.now();
    const record: EmergencyRecord = { emergencyId, userId, status: EmergencyStatus.ACTIVE, triggeredAt: Date.now() };
    db.emergencies.push(record);
    saveDB(db);
    
    // Simulate FCM/SMS Notification
    console.log(`%c[FCM BROADCAST] High Priority SOS Sent for ${userId}`, 'background: #D32F2F; color: white; padding: 5px;');
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

  getAllActiveEmergencies: (): EmergencyRecord[] => {
    return getDB().emergencies.filter((e: EmergencyRecord) => e.status === EmergencyStatus.ACTIVE);
  },

  // Added missing getActiveEmergency method to fix error in App.tsx
  getActiveEmergency: (userId: string): EmergencyRecord | undefined => {
    return getDB().emergencies.find((e: EmergencyRecord) => e.userId === userId && e.status === EmergencyStatus.ACTIVE);
  },

  // GET VICTIM DETAILS
  getUserById: (userId: string): UserProfile | undefined => {
    const db = getDB();
    return Object.values(db.users).find((u: any) => u.userId === userId) as UserProfile;
  },

  // LOCATION CORE
  pushLocation: (location: LocationUpdate) => {
    const db = getDB();
    db.locations.push(location);
    saveDB(db);
  },

  getEmergencyLocations: (emergencyId: string): LocationUpdate[] => {
    return getDB().locations.filter((l: LocationUpdate) => l.emergencyId === emergencyId);
  }
};
