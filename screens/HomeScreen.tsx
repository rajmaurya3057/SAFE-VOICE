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
  const [lastHeard, setLastHeard] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<any>(null);
  const isTriggeringRef = useRef(false);
  const activeSessionRef = useRef(false);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        activeSessionRef.current = false;
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Stop command failed, likely already idle.");
      }
    }
  }, []);

  const startRecognition = useCallback(() => {
    if (!recognitionRef.current || !isArmed || isTriggeringRef.current || activeSessionRef.current) return;
    
    try {
      recognitionRef.current.start();
      activeSessionRef.current = true;
      setMicError(null);
    } catch (e) {
      console.warn("Recognition start failed:", e);
    }
  }, [isArmed]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }

        const fullText = currentTranscript.trim().toUpperCase();
        if (fullText) setLastHeard(fullText);

        const target = user.emergencyKeyword.trim().toUpperCase();
        if (fullText.includes(target) && !isTriggeringRef.current) {
          isTriggeringRef.current = true;
          console.log("%c[SOS KEYWORD MATCHED]", "background: #D32F2F; color: white; padding: 5px; font-weight: bold;");
          stopRecognition();
          onTriggerSOS();
        }
      };

      recognition.onstart = () => {
        setIsListening(true);
        activeSessionRef.current = true;
      };
      
      recognition.onerror = (event: any) => {
        // Handle common errors
        if (event.error === 'no-speech') {
          // This is a normal timeout, we don't show it to the user as an error
          console.log("No speech detected, session will auto-restart...");
        } else if (event.error === 'not-allowed') {
          setMicError("Mic Permission Denied");
          setIsArmed(false);
        } else if (event.error === 'network') {
          setMicError("Network Link Failure");
        } else if (event.error !== 'aborted') {
          console.warn("Speech Recognition Error:", event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        activeSessionRef.current = false;
        // Aggressively restart if armed and no SOS triggered
        if (isArmed && !isTriggeringRef.current) {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(startRecognition, 200);
        }
      };

      recognitionRef.current = recognition;

      if (isArmed) {
        startRecognition();
      }
    } else {
      setMicError("Browser Unsupported");
    }

    return () => {
      isTriggeringRef.current = false;
      stopRecognition();
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    };
  }, [isArmed, user.emergencyKeyword, onTriggerSOS, startRecognition, stopRecognition]);

  const toggleArm = () => {
    const newState = !isArmed;
    setIsArmed(newState);
    firebaseService.updateProfile(user.userId, { isArmed: newState });
    refreshUser();
    
    if (newState) {
      isTriggeringRef.current = false;
      startRecognition();
    } else {
      stopRecognition();
    }
  };

  const userInitials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col h-full w-full bg-[#0F1115]">
      {/* Header */}
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
            <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 border-2 border-[#1A1D24] rounded-full shadow-lg ${isArmed ? 'bg-red-500 animate-pulse shadow-red-500/50' : 'bg-green-500 shadow-green-500/50'}`}></div>
          </div>
          <div>
            <h3 className="text-sm font-black text-white leading-none tracking-tight">{user.name.split(' ')[0].toUpperCase()}</h3>
            <span className="text-[8px] text-gray-600 uppercase font-black tracking-[0.2em] mt-1.5 block">
              {isArmed ? 'Voice Monitoring Active' : 'Sensors Standby'}
            </span>
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
        <div className={`relative w-80 h-80 rounded-[4rem] border-2 transition-all duration-700 flex items-center justify-center ${isArmed ? 'border-red-500 shadow-[0_0_80px_rgba(211,47,47,0.3)]' : 'border-gray-800 shadow-none'}`}>
          {isArmed && (
             <div className="absolute inset-0 rounded-[4rem] border-8 border-red-500/10 animate-ping"></div>
          )}
          <button 
            onClick={toggleArm}
            className={`w-64 h-64 rounded-[3.5rem] shadow-2xl flex flex-col items-center justify-center transition-all active:scale-95 relative overflow-hidden group ${isArmed ? 'bg-[#D32F2F]' : 'bg-[#1A1D24]'}`}
          >
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative mb-4">
               <i className={`fa-solid ${isArmed ? 'fa-shield-halved' : 'fa-shield'} text-7xl text-white transition-all duration-500 ${isArmed ? 'scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'scale-100'}`}></i>
               {isListening && <div className="absolute -top-4 -right-6 flex gap-0.5">
                  <div className="w-1 h-3 bg-white rounded-full animate-[bounce_1s_infinite]"></div>
                  <div className="w-1 h-5 bg-white rounded-full animate-[bounce_1.2s_infinite]"></div>
                  <div className="w-1 h-2 bg-white rounded-full animate-[bounce_0.8s_infinite]"></div>
               </div>}
            </div>
            <span className="text-2xl font-black tracking-[0.3em] text-white uppercase">{isArmed ? 'ARMED' : 'STANDBY'}</span>
            <p className="text-[10px] text-white/50 font-black uppercase mt-2 tracking-widest">{isArmed ? 'Listening for Help' : 'Tap to Arm'}</p>
          </button>
        </div>

        {/* Live Feedback Zone */}
        <div className="mt-12 w-full max-w-sm">
          <div className="bg-[#1A1D24] rounded-[2.5rem] p-6 border border-gray-800 shadow-2xl relative">
            <div className="flex justify-between items-center mb-5">
               <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Acoustic Signal</p>
               <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all ${isListening ? 'bg-red-500/20 text-red-500' : 'bg-gray-800 text-gray-600'}`}>
                 <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-700'}`}></span>
                 {isListening ? 'LISTENING' : 'OFF'}
               </div>
            </div>

            {micError ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
                <p className="text-[10px] text-red-500 font-black uppercase tracking-widest leading-relaxed">
                  <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                  {micError}
                </p>
              </div>
            ) : (
              <div className="bg-black/40 rounded-2xl p-5 border border-white/5 min-h-[70px] flex items-center justify-center overflow-hidden">
                {lastHeard ? (
                  <p className="text-sm font-mono text-blue-400 text-center uppercase tracking-wide animate-in fade-in duration-300 italic">
                    "{lastHeard}"
                  </p>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[9px] text-gray-700 uppercase font-black tracking-[0.3em] text-center">
                      {isArmed ? 'Ready for command...' : 'Microphone Inactive'}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between bg-black/40 rounded-2xl p-4 border border-white/5">
              <div className="flex flex-col">
                <span className="text-[8px] text-gray-500 uppercase font-black mb-1">Active Keyword</span>
                <span className={`text-xl font-mono text-white tracking-[0.4em] transition-all duration-500 ${!showKeyword ? 'blur-lg select-none opacity-20' : 'opacity-100'}`}>
                  {user.emergencyKeyword}
                </span>
              </div>
              <button 
                onClick={() => setShowKeyword(!showKeyword)} 
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${showKeyword ? 'bg-red-500 text-white' : 'bg-gray-800/50 text-[#D32F2F]'}`}
              >
                <i className={`fa-solid ${showKeyword ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-10 bg-[#1A1D24] rounded-t-[3.5rem] border-t border-gray-800 shadow-[0_-25px_60px_rgba(0,0,0,0.7)]">
        <button 
          onClick={() => {
            isTriggeringRef.current = true;
            onTriggerSOS();
          }}
          className="w-full bg-gradient-to-r from-[#D32F2F] to-red-600 text-white py-6 rounded-[2.5rem] flex items-center justify-center gap-5 font-black text-2xl tracking-[0.2em] transition-all active:scale-95 shadow-2xl shadow-red-900/40 group"
        >
          <i className="fa-solid fa-bolt-lightning animate-pulse text-3xl group-hover:scale-125 transition-transform"></i>
          PANIC SOS
        </button>
        
        <div className="mt-10 grid grid-cols-2 gap-6">
          <button onClick={onTrustedView} className="flex flex-col items-center gap-3 group">
            <div className="w-14 h-14 rounded-2xl bg-gray-800/50 flex items-center justify-center group-hover:bg-blue-600 group-hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all border border-white/5">
              <i className="fa-solid fa-tower-broadcast text-white text-xl"></i>
            </div>
            <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest group-hover:text-white transition-colors">Sentinel Hub</span>
          </button>

          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-800/50 flex items-center justify-center border border-white/5">
              <div className="flex flex-col gap-1.5 items-center">
                <div className="flex gap-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                </div>
                <div className="w-4 h-0.5 bg-emerald-500/30 rounded-full"></div>
              </div>
            </div>
            <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Core Status</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;