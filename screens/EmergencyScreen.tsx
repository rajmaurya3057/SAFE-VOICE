import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, EmergencyRecord, LocationUpdate } from '../types';
import { firebaseService } from '../firebase';
import { GoogleGenAI } from "@google/genai";
import L from 'leaflet';

interface EmergencyScreenProps {
  user: UserProfile;
  emergency: EmergencyRecord;
  onResolve: () => void;
}

const EmergencyScreen: React.FC<EmergencyScreenProps> = ({ user, emergency, onResolve }) => {
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [aiInsight, setAiInsight] = useState<string>("Analyzing local environment...");
  const [mapError, setMapError] = useState<boolean>(false);
  const [dispatchStatus, setDispatchStatus] = useState<{sent: number, total: number} | null>(null);
  
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pathRef = useRef<L.Polyline | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    const handleDispatch = (e: any) => {
      const data = e.detail;
      if (data.sentCount !== undefined) {
        setDispatchStatus({ sent: data.sentCount, total: data.totalCount || 0 });
      }
    };
    window.addEventListener('twilio_dispatch_result', handleDispatch);
    return () => window.removeEventListener('twilio_dispatch_result', handleDispatch);
  }, []);

  useEffect(() => {
    const initMap = () => {
      const mapElement = document.getElementById("leaflet-map");
      if (!mapElement || mapRef.current) return;

      try {
        mapRef.current = L.map(mapElement, {
          zoomControl: false,
          attributionControl: true,
          center: [0, 0],
          zoom: 18
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap'
        }).addTo(mapRef.current);

        pathRef.current = L.polyline([], {
          color: "#D32F2F",
          weight: 4,
          opacity: 0.8
        }).addTo(mapRef.current);
        
        setMapError(false);
      } catch (err) {
        console.error("Leaflet initialization failed:", err);
        setMapError(true);
      }
    };

    initMap();

    if ("geolocation" in navigator) {
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
            const latLng: L.LatLngExpression = [latitude, longitude];
            mapRef.current.setView(latLng, mapRef.current.getZoom());
            
            if (!markerRef.current) {
              const customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: #D32F2F; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              });

              markerRef.current = L.marker(latLng, { icon: customIcon }).addTo(mapRef.current);
            } else {
              markerRef.current.setLatLng(latLng);
            }

            if (pathRef.current) {
              pathRef.current.addLatLng(latLng);
            }
          }
        },
        (err) => console.error("GPS Error:", err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [emergency.emergencyId]);

  useEffect(() => {
    const fetchAiAdvice = async () => {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) return;
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: "Provide a very short tactical safety tip (10 words max) for someone in immediate danger. For example: 'Stay in lit areas' or 'Find a safe exit'."
        });
        setAiInsight(response.text || "Scanning perimeter. Stay alert.");
      } catch (e) {
        setAiInsight("Protocol active. Move toward safety.");
      }
    };
    fetchAiAdvice();
    const interval = setInterval(fetchAiAdvice, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      <div id="leaflet-map" className="absolute inset-0 z-0">
        {mapError && (
          <div className="h-full w-full flex flex-col items-center justify-center bg-[#090b0e] p-8 text-center">
             <i className="fa-solid fa-map-location-dot text-gray-800 text-6xl mb-6"></i>
             <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest leading-relaxed">Map Feed Interrupted</p>
          </div>
        )}
      </div>

      <div className="absolute top-10 left-4 right-4 z-10 space-y-3 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl pointer-events-auto">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
              <h2 className="text-[10px] font-black tracking-widest text-red-500 uppercase">Tactical Advice</h2>
            </div>
            <span className="text-[8px] font-mono text-gray-500 uppercase">Real-time Feed</span>
          </div>
          <p className="text-white text-xs font-bold leading-relaxed italic">"{aiInsight}"</p>
        </div>

        {/* SOS Dispatch Status HUD */}
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl pointer-events-auto flex items-center justify-between">
           <div className="flex items-center gap-3">
              <i className="fa-solid fa-tower-broadcast text-blue-500 text-xs"></i>
              <span className="text-[9px] font-black uppercase text-gray-400">SMS Dispatch:</span>
           </div>
           {dispatchStatus ? (
             <span className={`text-[10px] font-black font-mono ${dispatchStatus.sent > 0 ? 'text-green-500' : 'text-red-500'}`}>
               {dispatchStatus.sent}/{dispatchStatus.total} SUCCESS
             </span>
           ) : (
             <div className="flex items-center gap-2">
                <span className="text-[9px] font-black font-mono text-yellow-500 uppercase animate-pulse">Broadcasting...</span>
             </div>
           )}
        </div>
      </div>

      <div className="absolute bottom-10 left-6 right-6 z-20">
        <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between mb-6 px-2">
             <div>
               <p className="text-[8px] text-gray-500 font-black uppercase mb-1">Operative</p>
               <h4 className="text-white text-sm font-black uppercase tracking-tight">{user.name}</h4>
             </div>
             <div className="text-right">
                <p className="text-[8px] text-gray-500 font-black uppercase mb-1">Signal Quality</p>
                <div className="flex gap-0.5 items-end h-3">
                   <div className="w-1 h-1 bg-emerald-500"></div>
                   <div className="w-1 h-2 bg-emerald-500"></div>
                   <div className="w-1 h-3 bg-emerald-500"></div>
                   <div className="w-1 h-2.5 bg-gray-700"></div>
                </div>
             </div>
          </div>
          
          <button 
            onClick={onResolve}
            className="w-full bg-[#10B981] hover:bg-emerald-400 text-white py-5 rounded-[1.5rem] font-black text-xs tracking-[0.2em] shadow-2xl active:scale-95 transition-all uppercase"
          >
            I am safe / Terminate Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyScreen;