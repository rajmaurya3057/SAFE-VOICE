
import React, { useState, useEffect, useRef } from 'react';
import { EmergencyRecord, LocationUpdate, UserProfile, EmergencyStatus } from '../types';
import { firebaseService } from '../firebase';

// Declare google as any to fix "Cannot find name 'google'" and "Cannot find namespace 'google'" errors.
declare const google: any;

interface TrackingScreenProps {
  emergencyId: string;
}

const TrackingScreen: React.FC<TrackingScreenProps> = ({ emergencyId }) => {
  const [emergency, setEmergency] = useState<EmergencyRecord | null>(null);
  const [victim, setVictim] = useState<UserProfile | null>(null);
  const [lastLoc, setLastLoc] = useState<LocationUpdate | null>(null);
  
  // Use any type for Google Maps objects to bypass missing type definitions.
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const pathRef = useRef<any>(null);

  useEffect(() => {
    const fetchData = () => {
      const records = JSON.parse(localStorage.getItem('SAFE_VOICE_DB') || '{}');
      const found = records.emergencies?.find((e: any) => e.emergencyId === emergencyId);
      if (found) {
        setEmergency(found);
        const victimData = Object.values(records.users).find((u: any) => u.userId === found.userId) as UserProfile;
        setVictim(victimData);
        
        const locs = records.locations?.filter((l: any) => l.emergencyId === emergencyId) || [];
        if (locs.length > 0) {
          const latest = locs[locs.length - 1];
          setLastLoc(latest);
          updateMap(locs);
        }
      }
    };

    const updateMap = (locs: LocationUpdate[]) => {
      if (!mapRef.current) return;
      const latest = locs[locs.length - 1];
      const latLng = { lat: latest.latitude, lng: latest.longitude };
      
      mapRef.current.setCenter(latLng);
      if (!markerRef.current) {
        // Fix: Use declared google global for Marker initialization.
        markerRef.current = new google.maps.Marker({
          position: latLng,
          map: mapRef.current,
          icon: {
            // Fix: Access SymbolPath from declared google global.
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: "#D32F2F",
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
          }
        });
      } else {
        markerRef.current.setPosition(latLng);
      }

      if (pathRef.current) {
        pathRef.current.setPath(locs.map(l => ({ lat: l.latitude, lng: l.longitude })));
      }
    };

    const initMap = async () => {
      // @ts-ignore
      const { Map } = await google.maps.importLibrary("maps");
      mapRef.current = new Map(document.getElementById("tracking-map")!, {
        zoom: 17,
        disableDefaultUI: true,
        styles: [{ elementType: "geometry", stylers: [{ color: "#242f3e" }] }]
      });
      // Fix: Use declared google global for Polyline initialization.
      pathRef.current = new google.maps.Polyline({
        strokeColor: "#D32F2F",
        strokeWeight: 4,
        map: mapRef.current
      });
      fetchData();
    };

    initMap();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [emergencyId]);

  if (!emergency || !victim) return (
    <div className="h-full w-full flex items-center justify-center bg-[#0F1115]">
       <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest">Searching for link...</p>
    </div>
  );

  const isClosed = emergency.status === EmergencyStatus.SAFE;

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      <div id="tracking-map" className="absolute inset-0 z-0"></div>

      <div className="absolute top-10 left-4 right-4 z-10">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white">
              <i className="fa-solid fa-location-crosshairs"></i>
           </div>
           <div>
              <h2 className="text-white font-black text-[10px] uppercase tracking-widest">{victim.name} Tracking</h2>
              <p className="text-red-500 text-[8px] font-mono">{isClosed ? 'SIGNAL TERMINATED' : 'LIVE UPLINK ACTIVE'}</p>
           </div>
        </div>
      </div>

      {isClosed && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-10 text-center">
           <i className="fa-solid fa-circle-check text-emerald-500 text-6xl mb-6"></i>
           <h3 className="text-white font-black text-2xl uppercase tracking-tighter mb-2">Operative Safe</h3>
           <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">This tracking session has been securely closed.</p>
        </div>
      )}

      <div className="absolute bottom-10 left-4 right-4 z-10">
         <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-3 flex justify-between items-center">
            <span className="text-[7px] text-gray-600 font-black uppercase tracking-widest">Safe-Voice Sentinel Network</span>
            <div className="flex gap-1">
               <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
               <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default TrackingScreen;
