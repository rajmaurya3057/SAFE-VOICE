import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, AppState, EmergencyRecord, EmergencyStatus } from './types';
import { firebaseService } from './firebase';
import SplashScreen from './screens/SplashScreen';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import EmergencyScreen from './screens/EmergencyScreen';
import SettingsScreen from './screens/SettingsScreen';
import TrustedContactView from './screens/TrustedContactView';
import TrackingScreen from './screens/TrackingScreen';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppState>('SPLASH');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeEmergency, setActiveEmergency] = useState<EmergencyRecord | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  
  // App initialization & Deep Linking
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (id && window.location.pathname.includes('/track')) {
      setTrackId(id);
      setCurrentScreen('TRACKING_LINK');
      return;
    }

    const timer = setTimeout(() => {
      const savedUser = firebaseService.getCurrentUser();
      if (savedUser) {
        setUser(savedUser);
        const emergency = firebaseService.getActiveEmergency(savedUser.userId);
        if (emergency) {
          setActiveEmergency(emergency);
          setCurrentScreen('EMERGENCY');
        } else {
          setCurrentScreen('HOME');
        }
      } else {
        setCurrentScreen('AUTH');
      }
    }, 2500); 
    return () => clearTimeout(timer);
  }, []);

  // Poll for SOS updates
  useEffect(() => {
    const checkStatus = () => {
      if (!user || currentScreen === 'TRACKING_LINK') return;
      const emergency = firebaseService.getActiveEmergency(user.userId);
      if (emergency && currentScreen !== 'EMERGENCY') {
        setActiveEmergency(emergency);
        setCurrentScreen('EMERGENCY');
      } else if (!emergency && currentScreen === 'EMERGENCY') {
        setActiveEmergency(null);
        setCurrentScreen('HOME');
      }
    };

    const interval = setInterval(checkStatus, 3000);
    window.addEventListener('storage_update', checkStatus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage_update', checkStatus);
    };
  }, [user, currentScreen]);

  const handleLogin = (userData: UserProfile) => {
    setUser(userData);
    setCurrentScreen('HOME');
  };

  const handleLogout = () => {
    firebaseService.logout();
    setUser(null);
    setCurrentScreen('AUTH');
  };

  const triggerSOS = useCallback(() => {
    if (!user) return;
    const emergencyId = firebaseService.triggerEmergency(user.userId);
    const emergency = {
      emergencyId,
      userId: user.userId,
      status: EmergencyStatus.ACTIVE,
      triggeredAt: Date.now()
    };
    setActiveEmergency(emergency);
    setCurrentScreen('EMERGENCY');
  }, [user]);

  const resolveEmergency = () => {
    if (activeEmergency) {
      firebaseService.resolveEmergency(activeEmergency.emergencyId);
      setActiveEmergency(null);
      setCurrentScreen('HOME');
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto relative overflow-hidden bg-[#0F1115]">
      {currentScreen === 'SPLASH' && <SplashScreen />}
      
      {currentScreen === 'AUTH' && (
        <AuthScreen onLogin={handleLogin} />
      )}
      
      {currentScreen === 'TRACKING_LINK' && trackId && (
        <TrackingScreen emergencyId={trackId} />
      )}

      {currentScreen === 'HOME' && user && (
        <HomeScreen 
          user={user} 
          onLogout={handleLogout}
          onTriggerSOS={triggerSOS}
          onSettings={() => setCurrentScreen('SETTINGS')}
          onTrustedView={() => setCurrentScreen('TRUSTED_VIEW')}
          refreshUser={() => setUser(firebaseService.getCurrentUser())}
        />
      )}

      {currentScreen === 'SETTINGS' && user && (
        <SettingsScreen 
          user={user} 
          onBack={() => setCurrentScreen('HOME')}
          refreshUser={() => setUser(firebaseService.getCurrentUser())}
        />
      )}

      {currentScreen === 'EMERGENCY' && user && activeEmergency && (
        <EmergencyScreen 
          user={user} 
          emergency={activeEmergency}
          onResolve={resolveEmergency}
        />
      )}

      {currentScreen === 'TRUSTED_VIEW' && (
        <TrustedContactView onBack={() => setCurrentScreen('HOME')} />
      )}
    </div>
  );
};

export default App;