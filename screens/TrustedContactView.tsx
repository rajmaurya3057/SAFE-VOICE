import React, { useState, useEffect, useRef } from 'react';
import { EmergencyRecord, LocationUpdate, UserProfile } from '../types';
import { firebaseService } from '../firebase';

// Declare google as any to fix "Cannot find name 'google'" and "Cannot find namespace 'google'" errors.
declare const google: any;

interface TrustedContactViewProps {
  onBack: () => void;
}

const TrustedContactView: React.FC<TrustedContactViewProps> = ({ onBack }) => {
  const [activeEmergencies, setActiveEmergencies] = useState<EmergencyRecord[]>([]);
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyRecord | null>(null);
  const [victimProfile, setVictimProfile] = useState<UserProfile | null>(null);
  const [confirmSafeId, setConfirmSafeId] = useState<string | null>(null);
  
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const pathRef = useRef<any>(null);

  const refreshData = () => {
    const active = firebaseService.getAllActiveEmergencies();
    setActiveEmergencies(active);
    
    if (selectedEmergency) {
      const stillActive = active.find(e => e.emergencyId === selectedEmergency.emergencyId);
      if (stillActive) {
        const locs = firebaseService.getEmergencyLocations(stillActive.emergencyId);
        updateMap(locs);
      } else {
        setSelectedEmergency(null);
        setVictimProfile(null);
        if (markerRef.current) markerRef.current.setMap(null);
        if (pathRef.current) pathRef.current.setPath([]);
      }
    }
  };

  const updateMap = (locs: LocationUpdate[]) => {
    if (!mapRef.current || locs.length === 0) return;
    const latest = locs[locs.length - 1];
    const latLng = { lat: latest.latitude, lng: latest.longitude };
    
    mapRef.current.setCenter(latLng);
    
    if (markerRef.current) {
      markerRef.current.setPosition(latLng);
    } else {
      markerRef.current = new google.maps.Marker({
        position: latLng,
        map: mapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#D32F2F",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
        },
        title: victimProfile?.name || "Target"
      });
    }

    if (pathRef.current) {
      pathRef.current.setPath(locs.map(l => ({ lat: l.latitude, lng: l.longitude })));
    }
  };

  useEffect(() => {
    const initMap = async () => {
      if (typeof google === 'undefined') return;
      try {
        const { Map } = await google.maps.importLibrary("maps");
        mapRef.current = new Map(document.getElementById('command-map'), {
          zoom: 15,
          center: { lat: 20, lng: 0 },
          disableDefaultUI: true,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
          ]
        });

        pathRef.current = new google.maps.Polyline({
          strokeColor: '#D32F2F',
          strokeOpacity: 0.6,
          strokeWeight: 4,
          map: mapRef.current
        });
      } catch (err) {
        console.error("Map initialization failed:", err);
      }
    };

    initMap();
    const interval = setInterval(refreshData, 3000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const selectEmergency = (e: EmergencyRecord) => {
    setSelectedEmergency(e);
    const profile = firebaseService.getUserById(e.userId) || null;
    setVictimProfile(profile);
    const locs = firebaseService.getEmergencyLocations(e.emergencyId);
    updateMap(locs);
  };

  return (
    <div className="relative h-full w-full bg-[#090B0E] text-white overflow-hidden">
      {/* Immersive Map Background */}
      <div id="command-map" className="absolute inset-0 z-0"></div>

      {/* HUD Header */}
      <div className="absolute top-10 left-4 right-4 z-10 flex items-center justify-between">
        <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all">
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-2 flex flex-col items-center">
          <span className="text-[8px] font-black tracking-[0.4em] text-blue-500 uppercase">Sentinel Command</span>
          <span className="text-[6px] text-emerald-500 font-mono">LINK STABLE // HUB-01</span>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-emerald-500">
           <i className="fa-solid fa-tower-broadcast animate-pulse"></i>
        </div>
      </div>

      {/* Floating Target View */}
      {selectedEmergency && victimProfile && (
        <div className="absolute bottom-40 left-6 right-6 z-10 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 shadow-2xl pointer-events-auto">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-600/50 flex items-center justify-center">
                   <i className="fa-solid fa-crosshairs text-red-500"></i>
                </div>
                <div className="flex-1">
                   <h3 className="text-[11px] font-black uppercase text-white tracking-tight">{victimProfile.name}</h3>
                   <p className="text-[7px] font-mono text-red-500 uppercase">Distress Signal Active</p>
                </div>
                <button 
                  onClick={() => setConfirmSafeId(selectedEmergency.emergencyId)}
                  className="bg-emerald-600 px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest active:scale-90 transition-all"
                >
                  Mark Safe
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Collapsible Intercept List (Docked Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black to-transparent pt-10 pb-8 px-6">
        <div className="bg-black/40 backdrop-blur-lg border-t border-white/10 rounded-t-[2.5rem] p-5 max-h-[140px] overflow-y-auto">
           <p className="text-[7px] text-gray-500 font-black uppercase tracking-widest mb-3 text-center">Active Signal Intercepts</p>
           {activeEmergencies.length === 0 ? (
             <p className="text-center text-[8px] text-gray-700 py-4 italic font-mono uppercase">Scanning Perimeter...</p>
           ) : (
             <div className="flex flex-col gap-2">
               {activeEmergencies.map(e => (
                 <div 
                   key={e.emergencyId} 
                   onClick={() => selectEmergency(e)}
                   className={`px-4 py-3 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${selectedEmergency?.emergencyId === e.emergencyId ? 'bg-red-500/20 border-red-500' : 'bg-white/5 border-white/10'}`}
                 >
                   <span className="text-[9px] font-black text-white">TARGET: {e.emergencyId.slice(-6)}</span>
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmSafeId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/80 backdrop-blur-md">
          <div className="bg-[#12151A] border border-white/10 w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl">
            <h3 className="text-sm font-black text-white uppercase mb-2 tracking-widest">Verify Secure?</h3>
            <p className="text-gray-500 text-[9px] font-black uppercase mb-8 leading-relaxed">Closing this intercept will terminate live link.</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  firebaseService.resolveEmergency(confirmSafeId);
                  setConfirmSafeId(null);
                }} 
                className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition-all"
              >
                Confirm Target Safe
              </button>
              <button onClick={() => setConfirmSafeId(null)} className="text-[9px] text-gray-600 uppercase font-black py-2">Abort</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrustedContactView;