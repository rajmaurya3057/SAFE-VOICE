import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EmergencyRecord, LocationUpdate, UserProfile, EmergencyStatus } from '../types';
import { firebaseService } from '../firebase';
import L from 'leaflet';

interface TrackingScreenProps {
  emergencyId: string;
}

const TrackingScreen: React.FC<TrackingScreenProps> = ({ emergencyId }) => {
  const [emergency, setEmergency] = useState<EmergencyRecord | null>(null);
  const [victim, setVictim] = useState<UserProfile | null>(null);
  const [locations, setLocations] = useState<LocationUpdate[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pathRef = useRef<L.Polyline | null>(null);

  const fetchData = useCallback(() => {
    const records = JSON.parse(localStorage.getItem('SAFE_VOICE_DB') || '{}');
    const found = records.emergencies?.find((e: any) => e.emergencyId === emergencyId);
    
    if (found) {
      setEmergency(found);
      const victimData = Object.values(records.users).find((u: any) => u.userId === found.userId) as UserProfile;
      setVictim(victimData);
      
      const locs = records.locations?.filter((l: any) => l.emergencyId === emergencyId) || [];
      setLocations(locs);
      
      if (locs.length > 0) {
        updateMapElements(locs);
      }
    }
  }, [emergencyId]);

  const updateMapElements = (locs: LocationUpdate[]) => {
    if (!mapRef.current) return;
    const latest = locs[locs.length - 1];
    const latLng: L.LatLngExpression = [latest.latitude, latest.longitude];
    
    // Smoothly pan to latest location
    mapRef.current.panTo(latLng);

    // Update or create marker
    if (!markerRef.current) {
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #D32F2F; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      markerRef.current = L.marker(latLng, { icon: customIcon }).addTo(mapRef.current);
    } else {
      markerRef.current.setLatLng(latLng);
    }

    // Update Breadcrumb Path
    if (pathRef.current) {
      pathRef.current.setLatLngs(locs.map(l => [l.latitude, l.longitude] as L.LatLngExpression));
    }
  };

  useEffect(() => {
    const initMap = () => {
      const mapElement = document.getElementById("leaflet-tracking-map");
      if (!mapElement || mapRef.current) return;

      try {
        mapRef.current = L.map(mapElement, {
          zoom: 17,
          zoomControl: false,
          attributionControl: true,
          center: [0, 0]
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap'
        }).addTo(mapRef.current);

        pathRef.current = L.polyline([], {
          color: "#D32F2F",
          weight: 3,
          opacity: 0.6
        }).addTo(mapRef.current);

        setIsLoaded(true);
        setMapError(false);
        fetchData();
      } catch (err) {
        console.error("Leaflet initialization failed:", err);
        setMapError(true);
      }
    };

    initMap();

    // The "onSnapshot" Simulator: Instant reactive updates via cross-tab event
    window.addEventListener('storage_update', fetchData);
    window.addEventListener('storage', fetchData); // Standard storage event for other tabs

    return () => {
      window.removeEventListener('storage_update', fetchData);
      window.removeEventListener('storage', fetchData);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [fetchData]);

  if (!isLoaded || !emergency || !victim) return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-[#0F1115] gap-6">
       <div className="w-12 h-12 border-4 border-gray-800 border-t-red-600 rounded-full animate-spin"></div>
       <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Establishing Satellite Uplink...</p>
    </div>
  );

  const lastLoc = locations[locations.length - 1];
  const isClosed = emergency.status === EmergencyStatus.SAFE;

  return (
    <div className="relative h-full w-full bg-black overflow-hidden font-sans">
      {/* Real-time Map Canvas */}
      <div id="leaflet-tracking-map" className="absolute inset-0 z-0">
        {mapError && (
          <div className="h-full w-full flex flex-col items-center justify-center bg-[#090b0e] p-8 text-center">
             <i className="fa-solid fa-map-location-dot text-gray-800 text-6xl mb-6"></i>
             <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest leading-relaxed">Map Feed Interrupted</p>
          </div>
        )}
      </div>
      
      {/* Scanning HUD Effect */}
      <div className="absolute inset-0 z-5 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_center,_transparent_0%,_black_100%)]"></div>

      {/* Header HUD */}
      <div className="absolute top-10 left-4 right-4 z-10 flex flex-col gap-3">
        <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
           <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${isClosed ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-red-600 animate-pulse shadow-red-600/40'}`}>
              <i className={`fa-solid ${isClosed ? 'fa-shield-check' : 'fa-satellite-dish'}`}></i>
           </div>
           <div className="flex-1">
              <h2 className="text-white font-black text-xs uppercase tracking-widest">{victim.name} Tracking</h2>
              <p className={`text-[8px] font-mono font-black ${isClosed ? 'text-emerald-500' : 'text-red-500 animate-pulse'}`}>
                {isClosed ? 'SIGNAL TERMINATED // STATUS: SAFE' : 'LIVE TACTICAL FEED // STATUS: DISTRESS'}
              </p>
           </div>
           <div className="text-right flex flex-col items-end">
              <span className="text-[7px] text-gray-500 font-black uppercase">Intercept</span>
              <span className="text-[10px] font-mono text-gray-400">#{emergencyId.slice(-6)}</span>
           </div>
        </div>

        {!isClosed && lastLoc && (
           <div className="flex gap-2 animate-in slide-in-from-top duration-500">
             <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-xl px-3 py-1.5 flex flex-col">
                <span className="text-[6px] text-gray-600 font-black uppercase">Latitude</span>
                <span className="text-[9px] font-mono text-white">{lastLoc.latitude.toFixed(6)}</span>
             </div>
             <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-xl px-3 py-1.5 flex flex-col">
                <span className="text-[6px] text-gray-600 font-black uppercase">Longitude</span>
                <span className="text-[9px] font-mono text-white">{lastLoc.longitude.toFixed(6)}</span>
             </div>
             <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-xl px-3 py-1.5 flex flex-col ml-auto">
                <span className="text-[6px] text-gray-600 font-black uppercase">Last Signal</span>
                <span className="text-[9px] font-mono text-white">{new Date(lastLoc.timestamp).toLocaleTimeString([], {hour12: false, minute:'2-digit', second:'2-digit'})}</span>
             </div>
           </div>
        )}
      </div>

      {/* Security Overlay for Closed Sessions */}
      {isClosed && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-700">
           <div className="w-24 h-24 rounded-full border-4 border-emerald-500/20 flex items-center justify-center mb-8 relative">
              <i className="fa-solid fa-check text-emerald-500 text-5xl"></i>
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500 animate-ping opacity-20"></div>
           </div>
           <h3 className="text-white font-black text-3xl uppercase tracking-tighter mb-3">Protocol Success</h3>
           <p className="text-gray-500 text-xs font-medium uppercase tracking-[0.2em] leading-relaxed max-w-xs">
             The victim has declared safety. This tracking session has been securely terminated and data is archived.
           </p>
           <button 
             onClick={() => window.location.href = '/'}
             className="mt-12 bg-gray-800 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-gray-700 transition-all"
           >
             Return to Portal
           </button>
        </div>
      )}

      {/* Footer Branding */}
      <div className="absolute bottom-8 left-6 right-6 z-10">
         <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <i className="fa-solid fa-shield-heart text-[#D32F2F] text-xs"></i>
               <span className="text-[7px] text-gray-600 font-black uppercase tracking-[0.4em]">Safe-Voice Sentinel Network</span>
            </div>
            <div className="flex gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]"></div>
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30"></div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default TrackingScreen;