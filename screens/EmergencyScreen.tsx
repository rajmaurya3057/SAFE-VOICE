import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, EmergencyRecord, LocationUpdate } from '../types';
import { firebaseService } from '../firebase';
import { GoogleGenAI } from "@google/genai";

// Declare google as any to fix "Cannot find name 'google'" and "Cannot find namespace 'google'" errors.
declare const google: any;

interface EmergencyScreenProps {
  user: UserProfile;
  emergency: EmergencyRecord;
  onResolve: () => void;
}

const EmergencyScreen: React.FC<EmergencyScreenProps> = ({ user, emergency, onResolve }) => {
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [aiInsight, setAiInsight] = useState<string>("Initializing tactical oversight...");
  const [mapError, setMapError] = useState<boolean>(false);
  
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const pathRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    const initMap = async () => {
      // Check if google maps script actually loaded (prevents crash on invalid key)
      if (typeof google === 'undefined' || !google.maps || !google.maps.importLibrary) {
        setMapError(true);
        return;
      }

      try {
        const { Map } = await google.maps.importLibrary("maps");
        const mapDiv = document.getElementById("google-map");
        if (!mapDiv) return;

        mapRef.current = new Map(mapDiv, {
          center: { lat: 0, lng: 0 },
          zoom: 18,
          disableDefaultUI: true,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
          ]
        });

        pathRef.current = new google.maps.Polyline({
          strokeColor: "#D32F2F",
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map: mapRef.current
        });
      } catch (err) {
        console.error("Map initialization failed:", err);
        setMapError(true);
      }
    };

    initMap();

    // High Accuracy Polling
    if ("geolocation" in navigator) {
      const startTracking = () => {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const update: LocationUpdate = {
              emergencyId: emergency.emergencyId,
              latitude,
              longitude,
              timestamp: Date.now()
            };
            
            firebaseService.pushLocation(update);
            setLastUpdate(Date.now());
            
            if (mapRef.current) {
              const latLng = { lat: latitude, lng: longitude };
              mapRef.current.setCenter(latLng);
              
              if (!markerRef.current) {
                markerRef.current = new google.maps.Marker({
                  position: latLng,
                  map: mapRef.current,
                  icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
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
                const path = pathRef.current.getPath();
                path.push(new google.maps.LatLng(latitude, longitude));
              }
            }
          },
          (err) => console.error("GPS Error:", err),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      };
      startTracking();
    }

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [emergency.emergencyId]);

  // AI Tactical Feed
  useEffect(() => {
    const fetchAiAdvice = async () => {
      if (!process.env.API_KEY) return;
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: "Provide a one-sentence tactical safety advice for someone in a generic emergency situation. Be brief and calm."
        });
        setAiInsight(response.text || "Tactical link active. Stay aware.");
      } catch (e) {
        setAiInsight("Link active. Proceed with caution.");
      }
    };
    fetchAiAdvice();
    const interval = setInterval(fetchAiAdvice, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      {/* Immersive Map Container */}
      <div id="google-map" className="absolute inset-0 z-0 opacity-80">
        {mapError && (
          <div className="h-full w-full flex flex-col items-center justify-center bg-[#090b0e] p-8 text-center">
             <i className="fa-solid fa-map-location-dot text-gray-800 text-6xl mb-6"></i>
             <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest leading-relaxed">
               Tactical Mapping Offline<br/>
               <span className="text-gray-700">Check Sentinel Key Permissions</span>
             </p>
          </div>
        )}
      </div>

      {/* Glass Overlay UI */}
      <div className="absolute top-10 left-4 right-4 z-10 space-y-3 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl pointer-events-auto">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
              <h2 className="text-[10px] font-black tracking-widest text-red-500 uppercase">Live Intercept</h2>
            </div>
            <span className="text-[8px] font-mono text-gray-400">SYNC: {new Date(lastUpdate).toLocaleTimeString()}</span>
          </div>
          <p className="text-white text-xs font-bold leading-relaxed italic">"{aiInsight}"</p>
        </div>
      </div>

      {/* Floating Status Badge */}
      <div className="absolute top-1/2 left-4 z-10 -translate-y-1/2 pointer-events-none">
        <div className="bg-[#D32F2F] text-white py-4 px-2 rounded-full flex flex-col items-center gap-3 shadow-2xl border border-white/20">
           <i className="fa-solid fa-satellite-dish animate-pulse text-xs"></i>
           <div className="h-12 w-px bg-white/20"></div>
           <span className="text-[8px] font-black uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">Active SOS</span>
        </div>
      </div>

      {/* Control Dock */}
      <div className="absolute bottom-10 left-6 right-6 z-20">
        <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between mb-6">
             <div>
               <p className="text-[8px] text-gray-500 font-black uppercase mb-1">Target</p>
               <h4 className="text-white font-black uppercase tracking-tight">{user.name}</h4>
             </div>
             <div className="text-right">
                <p className="text-[8px] text-gray-500 font-black uppercase mb-1">Status</p>
                <div className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full">
                   <span className="text-[9px] text-red-500 font-black uppercase">Distress</span>
                </div>
             </div>
          </div>
          
          <button 
            onClick={onResolve}
            className="w-full bg-[#10B981] hover:bg-emerald-400 text-white py-5 rounded-3xl font-black text-sm tracking-[0.2em] shadow-2xl active:scale-95 transition-all uppercase"
          >
            Declare Safe Condition
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyScreen;