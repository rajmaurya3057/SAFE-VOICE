export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  phone: string;
  emergencyKeyword: string;
  isArmed: boolean;
  createdAt: number;
  profilePic?: string; // Base64 encoded image string
}

export interface Contact {
  contactId: string;
  userId: string;
  name: string;
  phone: string;
  relationship: string;
}

export enum EmergencyStatus {
  ACTIVE = 'ACTIVE',
  SAFE = 'SAFE'
}

export interface EmergencyRecord {
  emergencyId: string;
  userId: string;
  status: EmergencyStatus;
  triggeredAt: number;
  resolvedAt?: number;
}

export interface LocationUpdate {
  emergencyId: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

export type AppState = 'SPLASH' | 'AUTH' | 'HOME' | 'EMERGENCY' | 'SETTINGS' | 'TRUSTED_VIEW' | 'TRACKING_LINK';