
import React, { useState, useEffect, useRef } from 'react';
import { EmergencyRecord, LocationUpdate, EmergencyStatus, UserProfile } from '../types';
import { firebaseService } from '../firebase';

declare const L: any;

interface TrustedContactViewProps {
  onBack: () => void;
}

const TrustedContactView: React.FC<TrustedContactViewProps> = ({ onBack }) => {
  const [activeEmergencies, setActiveEmergencies] = useState<EmergencyRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationUpdate[]>([]);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const pathRef = useRef<any>(null);

  const refreshEmergencies = () => {
    const active = firebaseService.getAllActiveEmergencies();
    setActiveEmergencies(active);
    if (active.length > 0 && !selectedId) {
      setSelectedId(active[0].emergencyId);
    }
  };

  useEffect(() => {
    refreshEmergencies();
    const interval = setInterval(refreshEmergencies, 5000);
    window.addEventListener('storage_update', refreshEmergencies);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage_update', refreshEmergencies);
    };
  }, []);

  useEffect(() => {
    // Map setup
    if (!mapRef.current) {
      mapRef.current = L.map('responder-map', {
        zoomControl: false,
        attributionControl: false
      }).setView([20, 0], 2);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapRef.current);
      
      pathRef.current = L.polyline([], { color: '#D32F2F', weight: 4, opacity: 0.6 }).addTo(mapRef.current);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      const locs = firebaseService.getEmergencyLocations(selectedId);
      setLocations(locs);

      if (locs.length > 0 && mapRef.current) {
        const latest = locs[locs.length - 1];
        const latlng = [latest.latitude, latest.longitude];
        
        mapRef.current.setView(latlng, 16);
        
        // Update marker
        if (markersRef.current[selectedId]) {
          markersRef.current[selectedId].setLatLng(latlng);
        } else {
          const icon = L.divIcon({
            className: 'responder-icon',
            html: `<div class="relative">
                    <div class="absolute -inset-4 w-12 h-12 bg-red-500/30 rounded-full animate-ping"></div>
                    <div class="w-6 h-6 bg-red-600 rounded-full border-2 border-white flex items-center justify-center">
                       <i class="fa-solid fa-person text-white text-[10px]"></i>
                    </div>
                   </div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          markersRef.current[selectedId] = L.marker(latlng, { icon }).addTo(mapRef.current);
        }

        // Update path
        if (pathRef.current) {
          pathRef.current.setLatLngs(locs.map(l => [l.latitude, l.longitude]));
        }
      }
    }
  }, [selectedId, locations.length]);

  const handleRemoteTrigger = () => {
    // In this simulation, we'll trigger an alert for the first user we find if none is active
    // This demonstrates the "Trusted can trigger for victim" functionality
    const db = JSON.parse(localStorage.getItem('SAFE_VOICE_DB') || '{}');
    // Fix: Add UserProfile cast to handle 'unknown' type from JSON.parse and Object.values
    const firstUserId = (Object.values(db.users || {}) as UserProfile[])[0]?.userId;
    if (firstUserId) {
      firebaseService.triggerEmergency(firstUserId);
      refreshEmergencies();
    } else {
      alert("No registered users found to protect. Please sign up first.");
    }
  };

  const handleSafe = (id: string) => {
    firebaseService.resolveEmergency(id);
    if (markersRef.current[id]) {
      mapRef.current.removeLayer(markersRef.current[id]);
      delete markersRef.current[id];
    }
    refreshEmergencies();
    setSelectedId(null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0F1115]">
      {/* Dashboard Header */}
      <div className="p-6 pt-10 bg-[#1A1D24] border-b border-gray-800 shadow-xl flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-gray-800/50 flex items-center justify-center text-gray-400 hover:text-white transition-all">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">Responder Hub</h2>
            <span className="text-[9px] text-blue-400 font-bold uppercase tracking-tighter block mt-1">Live Sentinel Monitoring</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
           <span className="text-[10px] text-gray-500 font-black">SYSTEM LIVE</span>
        </div>
      </div>

      {/* Main Tracking Area */}
      <div className="flex-1 relative">
        <div id="responder-map" className="absolute inset-0 z-0 bg-gray-900"></div>
        
        {/* Overlay Controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
           <button 
             onClick={handleRemoteTrigger}
             className="bg-[#D32F2F] text-white p-4 rounded-2xl shadow-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest animate-pulse pointer-events-auto transition-transform active:scale-90"
           >
             <i className="fa-solid fa-tower-broadcast"></i>
             Remote Alert
           </button>
        </div>

        {/* Selected User Data */}
        {selectedId && (
           <div className="absolute bottom-24 left-4 right-4 z-10 bg-[#1A1D24]/90 backdrop-blur-xl border border-white/10 rounded-[2rem] p-5 shadow-2xl pointer-events-auto">
              <div className="flex justify-between items-start mb-4">
                 <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-wider">User Tracking Active</h3>
                    <p className="text-gray-500 text-[9px] font-bold uppercase tracking-tighter mt-1">
                       Emerg ID: {selectedId.substr(-8)} • {locations.length} Packets Received
                    </p>
                 </div>
                 <button 
                   onClick={() => handleSafe(selectedId)}
                   className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-900/20"
                 >
                   Clear Alert
                 </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                    <p className="text-[8px] text-gray-500 font-black uppercase">Latitude</p>
                    <p className="text-white font-mono text-xs">{locations[locations.length-1]?.latitude.toFixed(6) || '---'}</p>
                 </div>
                 <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                    <p className="text-[8px] text-gray-500 font-black uppercase">Longitude</p>
                    <p className="text-white font-mono text-xs">{locations[locations.length-1]?.longitude.toFixed(6) || '---'}</p>
                 </div>
              </div>
           </div>
        )}
      </div>

      {/* Responder List Panel */}
      <div className="bg-[#1A1D24] p-6 pb-10 rounded-t-[3rem] border-t border-gray-800 z-20 max-h-[300px] overflow-y-auto">
         <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <i className="fa-solid fa-list-check"></i>
            Active Alerts Queue
         </h4>
         
         {activeEmergencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
               <i className="fa-solid fa-shield-halved text-4xl mb-3 text-gray-600"></i>
               <p className="text-xs font-bold text-gray-600 uppercase">No active distress signals</p>
            </div>
         ) : (
            <div className="space-y-3">
               {activeEmergencies.map(e => (
                  <div 
                    key={e.emergencyId}
                    onClick={() => setSelectedId(e.emergencyId)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${selectedId === e.emergencyId ? 'bg-red-900/20 border-red-500/50' : 'bg-gray-900 border-gray-800'}`}
                  >
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center border border-red-600/30">
                           <i className="fa-solid fa-person-running text-red-500"></i>
                        </div>
                        <div>
                           <p className="text-white text-xs font-bold uppercase tracking-tight">Active SOS: {e.userId.substr(0,8)}</p>
                           <p className="text-gray-500 text-[8px] font-black uppercase mt-1">Broadcast start: {new Date(e.triggeredAt).toLocaleTimeString()}</p>
                        </div>
                     </div>
                     <i className="fa-solid fa-chevron-right text-gray-700"></i>
                  </div>
               ))}
            </div>
         )}
      </div>
    </div>
  );
};

export default TrustedContactView;
