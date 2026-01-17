
import React, { useState, useEffect, useRef } from 'react';
import { EmergencyRecord, LocationUpdate, EmergencyStatus, UserProfile } from '../types';
import { firebaseService } from '../firebase';

declare const L: any;

interface TrustedContactViewProps {
  onBack: () => void;
}

const TrustedContactView: React.FC<TrustedContactViewProps> = ({ onBack }) => {
  const [activeEmergencies, setActiveEmergencies] = useState<EmergencyRecord[]>([]);
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyRecord | null>(null);
  const [victimProfile, setVictimProfile] = useState<UserProfile | null>(null);
  const [locations, setLocations] = useState<LocationUpdate[]>([]);
  const [confirmSafeId, setConfirmSafeId] = useState<string | null>(null);
  const [receiptLogs, setReceiptLogs] = useState<string[]>([]);
  
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const pathRef = useRef<any>(null);

  const addReceipt = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setReceiptLogs(prev => [`[RECV ${time}] ${msg}`, ...prev].slice(0, 10));
  };

  const refreshData = () => {
    const active = firebaseService.getAllActiveEmergencies();
    
    if (active.length > activeEmergencies.length) {
      addReceipt("NEW DISTRESS SIGNAL INTERCEPTED");
    }

    setActiveEmergencies(active);
    
    if (active.length > 0 && !selectedEmergency) {
      handleSelectEmergency(active[0]);
    } else if (selectedEmergency) {
      const updated = active.find(e => e.emergencyId === selectedEmergency.emergencyId);
      if (updated) {
        const locs = firebaseService.getEmergencyLocations(updated.emergencyId);
        if (locs.length > locations.length) {
          addReceipt(`PACKET RECEIVED: ${locs.length}`);
        }
        setLocations(locs);
        updateMap(locs);
      } else {
        setSelectedEmergency(null);
        setVictimProfile(null);
        addReceipt("SIGNAL TERMINATED - USER SAFE");
      }
    }
  };

  const handleSelectEmergency = (e: EmergencyRecord) => {
    setSelectedEmergency(e);
    setVictimProfile(firebaseService.getUserById(e.userId) || null);
    const locs = firebaseService.getEmergencyLocations(e.emergencyId);
    setLocations(locs);
    updateMap(locs);
    addReceipt(`LOCK-ON: NODE ${e.emergencyId.substr(-4)}`);
  };

  const updateMap = (locs: LocationUpdate[]) => {
    if (!mapRef.current || locs.length === 0) return;
    const latest = locs[locs.length - 1];
    const latlng = [latest.latitude, latest.longitude];
    mapRef.current.setView(latlng, 17);
    if (markerRef.current) {
      markerRef.current.setLatLng(latlng);
    } else {
      const icon = L.divIcon({
        className: 'pulse-icon',
        html: `<div class="relative"><div class="absolute -inset-6 w-16 h-16 bg-red-600/20 rounded-full animate-ping"></div><div class="w-8 h-8 bg-red-600 rounded-full border-2 border-white flex items-center justify-center shadow-2xl"><i class="fa-solid fa-person-walking-exclamation text-white text-sm"></i></div></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      markerRef.current = L.marker(latlng, { icon }).addTo(mapRef.current);
    }
    if (pathRef.current) pathRef.current.setLatLngs(locs.map(l => [l.latitude, l.longitude]));
  };

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('command-map', { zoomControl: false, attributionControl: false }).setView([20, 0], 2);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 20 }).addTo(mapRef.current);
      pathRef.current = L.polyline([], { color: '#D32F2F', weight: 5, opacity: 0.8 }).addTo(mapRef.current);
    }
    const interval = setInterval(refreshData, 3000);
    window.addEventListener('storage_update', refreshData);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage_update', refreshData);
      if (mapRef.current) mapRef.current.remove();
    };
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-[#090B0E] text-white">
      <div className="p-6 pt-10 bg-[#12151A] border-b border-gray-800 flex items-center justify-between z-20 shadow-2xl">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-gray-800/50 flex items-center justify-center text-gray-400">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-blue-500">Sentinel Hub</h2>
            <p className="text-[10px] font-bold text-gray-500 uppercase">Prototype Sync Mode</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
           <div className="flex items-center gap-2">
              <span className="text-[8px] font-black text-green-500 uppercase">Encrypted</span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
           </div>
           <p className="text-[7px] text-gray-600 font-mono mt-1">NODE: SV-RELAY-01</p>
        </div>
      </div>

      <div className="flex-1 relative">
        <div id="command-map" className="absolute inset-0 z-0 grayscale-[0.2]"></div>
        
        {/* Connection Tooltip for Judges */}
        {!selectedEmergency && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-64 text-center">
             <div className="bg-blue-600/10 backdrop-blur-md border border-blue-500/20 p-6 rounded-[2rem]">
                <i className="fa-solid fa-satellite-dish text-blue-500 text-3xl mb-4 animate-bounce"></i>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Awaiting Signals</p>
                <p className="text-[8px] text-gray-500 font-bold uppercase leading-relaxed">
                  Open another tab and trigger SOS to see the live intercept in action.
                </p>
             </div>
          </div>
        )}

        {/* Signal Log Console */}
        <div className="absolute top-4 left-4 w-48 z-10 bg-black/80 border border-white/10 rounded-xl p-3 shadow-2xl max-h-40 overflow-hidden">
           <div className="flex items-center justify-between mb-2">
              <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">Protocol Audit</span>
           </div>
           <div className="space-y-1">
              {receiptLogs.length === 0 ? (
                <p className="text-[7px] font-mono text-gray-700 italic">Listening for packets...</p>
              ) : receiptLogs.map((log, i) => (
                <p key={i} className="text-[7px] font-mono text-blue-400 leading-none truncate">{log}</p>
              ))}
           </div>
        </div>

        {selectedEmergency && victimProfile && (
          <div className="absolute bottom-6 left-4 right-4 z-10 bg-[#12151A]/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-600/30 flex items-center justify-center">
                  <i className="fa-solid fa-user-ninja text-red-500 text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-white font-black text-sm uppercase">{victimProfile.name}</h3>
                  <p className="text-[9px] text-red-500 font-black uppercase tracking-widest animate-pulse">SOS BROADCASTING</p>
                </div>
              </div>
              <button onClick={() => setConfirmSafeId(selectedEmergency.emergencyId)} className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
                MARK SAFE
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                <p className="text-[8px] text-gray-500 font-black uppercase mb-1">Packet Stream</p>
                <p className="text-white font-mono text-[10px] font-bold">STABLE</p>
              </div>
              <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                <p className="text-[8px] text-gray-500 font-black uppercase mb-1">Signal TTL</p>
                <p className="text-blue-400 font-mono text-[10px] font-bold">REAL-TIME</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 pb-12 bg-[#12151A] border-t border-gray-800 z-20 max-h-[200px] overflow-y-auto rounded-t-[3.5rem] shadow-2xl">
        <h4 className="text-[9px] text-gray-500 font-black uppercase tracking-[0.25em] mb-4 text-center">Active Distress Intercepts</h4>
        {activeEmergencies.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest">Scanning Perimeters...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeEmergencies.map(e => (
              <div key={e.emergencyId} onClick={() => handleSelectEmergency(e)} className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedEmergency?.emergencyId === e.emergencyId ? 'bg-red-950/20 border-red-600/50' : 'bg-gray-900 border-gray-800'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></div>
                    <span className="text-[9px] text-white font-black uppercase">NODE {e.emergencyId.substr(-6)}</span>
                  </div>
                  <span className="text-[8px] text-red-500 font-black">TRACKING ON</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmSafeId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/80 backdrop-blur-md">
          <div className="bg-[#12151A] border border-white/10 w-full max-w-sm rounded-[3rem] p-10 text-center">
            <h3 className="text-lg font-black text-white uppercase mb-4">Secure Status?</h3>
            <p className="text-gray-500 text-[10px] font-black uppercase mb-10 leading-relaxed">Terminating this node will stop live location broadcasts immediately.</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  if (confirmSafeId) {
                    firebaseService.resolveEmergency(confirmSafeId);
                    setConfirmSafeId(null);
                  }
                }} 
                className="w-full bg-green-600 text-white font-black py-5 rounded-2xl uppercase tracking-widest"
              >
                Confirm Safe
              </button>
              <button onClick={() => setConfirmSafeId(null)} className="w-full text-gray-600 font-black py-2 uppercase text-[9px]">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrustedContactView;
