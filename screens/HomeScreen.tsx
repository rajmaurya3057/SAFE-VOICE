
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile } from '../types';
import { firebaseService } from '../firebase';

interface HomeScreenProps {
  user: UserProfile;
  onLogout: () => void;
  onTriggerSOS: () => void;
  onSettings: () => void;
  onTrustedView: () => void;
  refreshUser: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ user, onLogout, onTriggerSOS, onSettings, onTrustedView, refreshUser }) => {
  const [isArmed, setIsArmed] = useState(user.isArmed);
  const [isListening, setIsListening] = useState(false);
  const [showKeyword, setShowKeyword] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim().toUpperCase();
        console.log("%c[VOICE MONITOR]", "color: #D32F2F", transcript);
        if (transcript.includes(user.emergencyKeyword.toUpperCase())) {
          onTriggerSOS();
        }
      };

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (isArmed) {
          try { recognitionRef.current.start(); } catch(e) {}
        }
      };
      
      if (isArmed) {
        try { recognitionRef.current.start(); } catch(e) {}
      }
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [isArmed, user.emergencyKeyword, onTriggerSOS]);

  const toggleArm = () => {
    const newState = !isArmed;
    setIsArmed(newState);
    firebaseService.updateProfile(user.userId, { isArmed: newState });
    refreshUser();
    
    if (newState && recognitionRef.current) {
      try { recognitionRef.current.start(); } catch (e) {}
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const userInitials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col h-full w-full bg-[#0F1115]">
      {/* Dynamic Header */}
      <div className="flex justify-between items-center px-6 py-6 pt-10 bg-[#1A1D24] border-b border-gray-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-[1.25rem] bg-[#D32F2F]/10 flex items-center justify-center border border-[#D32F2F]/30 shadow-inner overflow-hidden">
              {user.profilePic ? (
                <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[#D32F2F] font-black text-sm">{userInitials}</span>
              )}
            </div>
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-[#1A1D24] rounded-full shadow-[0_0_8px_#22c55e]"></div>
          </div>
          <div>
            <h3 className="text-sm font-black text-white leading-none tracking-tight">{user.name.split(' ')[0].toUpperCase()}</h3>
            <span className="text-[8px] text-gray-600 uppercase font-black tracking-[0.2em] mt-1.5 block">Identity Authenticated</span>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button onClick={onSettings} className="w-11 h-11 rounded-2xl bg-gray-800/40 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-90 border border-white/5">
            <i className="fa-solid fa-gears text-sm"></i>
          </button>
          <button onClick={onLogout} className="w-11 h-11 rounded-2xl bg-gray-800/40 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all active:scale-90 border border-white/5">
            <i className="fa-solid fa-door-open text-sm"></i>
          </button>
        </div>
      </div>

      {/* Control Surface */}
      <div className="flex-1 flex flex-col items-center justify-center px-10">
        <div className={`relative w-80 h-80 rounded-[4rem] border-2 transition-all duration-700 flex items-center justify-center ${isArmed ? 'border-red-500 shadow-[0_0_60px_rgba(211,47,47,0.2)]' : 'border-gray-800 shadow-none'}`}>
          {isArmed && (
             <div className="absolute inset-0 rounded-[4rem] border-8 border-red-500/10 animate-ping"></div>
          )}
          <button 
            onClick={toggleArm}
            className={`w-64 h-64 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center transition-all active:scale-95 relative overflow-hidden group ${isArmed ? 'bg-[#D32F2F]' : 'bg-[#1A1D24]'}`}
          >
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative mb-4">
               <i className={`fa-solid ${isArmed ? 'fa-shield-halved' : 'fa-shield'} text-7xl text-white transition-all duration-500 ${isArmed ? 'scale-110' : 'scale-100'}`}></i>
               {isArmed && <i className="fa-solid fa-waveform-lines absolute -top-4 -right-4 text-white/40 text-2xl animate-pulse"></i>}
            </div>
            <span className="text-2xl font-black tracking-[0.3em] text-white uppercase">{isArmed ? 'ARMED' : 'STANDBY'}</span>
            <p className="text-[10px] text-white/50 font-black uppercase mt-2 tracking-widest">{isArmed ? 'Mic Monitoring' : 'Tap to Shield'}</p>
          </button>
        </div>

        {/* Keyword Interaction Zone */}
        <div className="mt-16 w-full max-w-sm">
          <div className="bg-[#1A1D24] rounded-[2.5rem] p-6 border border-gray-800 shadow-2xl relative">
            <div className="flex justify-between items-center mb-5">
               <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Active Trigger Phrase</p>
               <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all ${isListening ? 'bg-red-500/20 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-gray-800 text-gray-600'}`}>
                 <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-700'}`}></span>
                 {isListening ? 'Live Ears' : 'Offline'}
               </div>
            </div>
            <div className="flex items-center justify-between bg-black/40 rounded-2xl p-5 border border-white/5 group">
              <span className={`text-3xl font-mono text-white tracking-[0.3em] transition-all duration-300 ${!showKeyword ? 'blur-md select-none opacity-20' : 'opacity-100'}`}>
                {user.emergencyKeyword}
              </span>
              <button 
                onClick={() => setShowKeyword(!showKeyword)} 
                className="w-12 h-12 rounded-xl bg-gray-800/50 flex items-center justify-center text-[#D32F2F] hover:bg-red-500 hover:text-white transition-all"
              >
                <i className={`fa-solid ${showKeyword ? 'fa-eye-low-vision' : 'fa-eye'}`}></i>
              </button>
            </div>
            <p className="text-[9px] text-gray-600 mt-4 text-center font-black uppercase tracking-widest opacity-60">System listens for this cipher word only while ARMED.</p>
          </div>
        </div>
      </div>

      {/* Mission Footer */}
      <div className="px-8 py-10 bg-[#1A1D24] rounded-t-[3.5rem] border-t border-gray-800 shadow-[0_-25px_60px_rgba(0,0,0,0.7)]">
        <button 
          onClick={onTriggerSOS}
          className="w-full bg-gradient-to-r from-[#D32F2F] to-red-600 text-white py-6 rounded-[2.5rem] flex items-center justify-center gap-5 font-black text-2xl tracking-[0.2em] transition-all active:scale-95 shadow-2xl shadow-red-900/40 group"
        >
          <i className="fa-solid fa-radiation animate-pulse text-3xl group-hover:rotate-180 transition-transform duration-700"></i>
          PANIC SOS
        </button>
        
        <div className="mt-10 grid grid-cols-2 gap-6">
          <button onClick={onTrustedView} className="flex flex-col items-center gap-3 group">
            <div className="w-14 h-14 rounded-2xl bg-gray-800/50 flex items-center justify-center group-hover:bg-[#D32F2F] group-hover:shadow-[0_0_20px_rgba(211,47,47,0.3)] transition-all border border-white/5">
              <i className="fa-solid fa-users-rays text-white text-xl"></i>
            </div>
            <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest group-hover:text-white transition-colors">Trusted View</span>
          </button>

          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-800/50 flex items-center justify-center border border-white/5">
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              </div>
            </div>
            <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Sensors OK</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
