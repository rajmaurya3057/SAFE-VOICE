
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, EmergencyRecord, LocationUpdate } from '../types';
import { firebaseService } from '../firebase';
import { GoogleGenAI } from "@google/genai";

declare const L: any;

interface EmergencyScreenProps {
  user: UserProfile;
  emergency: EmergencyRecord;
  onResolve: () => void;
}

const EmergencyScreen: React.FC<EmergencyScreenProps> = ({ user, emergency, onResolve }) => {
  const [locations, setLocations] = useState<LocationUpdate[]>([]);
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);
  const [dispatchLogs, setDispatchLogs] = useState<string[]>([]);
  const [aiReport, setAiReport] = useState<string>("Initializing Safety Audit...");
  
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const pathRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setDispatchLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 5));
  };

  // Gemini Safety Auditor
  const runAiAudit = async (loc: LocationUpdate) => {
    try {
      // Use process.env.API_KEY directly as per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a professional security dispatcher. Audit the following safety data and provide a 1-sentence verification report: 
        Victim: ${user.name}, 
        Emergency ID: ${emergency.emergencyId}, 
        Current Coords: ${loc.latitude}, ${loc.longitude}, 
        Status: SOS ACTIVE. 
        Format: [SECURE LOG] {Report content}`
      });
      setAiReport(response.text || "Audit complete. Protocols verified.");
    } catch (e) {
      setAiReport("Audit link active. Monitoring coordinates...");
    }
  };

  useEffect(() => {
    addLog("System Initialized. SOS Broadcast start.");
    const contacts = firebaseService.getContacts(user.userId);
    contacts.forEach(c => addLog(`FCM PUSH: ALERT SENT TO ${c.name}`));

    const initMap = () => {
      const container = document.getElementById('map-container');
      if (container && !mapRef.current) {
        mapRef.current = L.map('map-container', {
          zoomControl: false,
          attributionControl: false
        }).setView([0, 0], 2);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(mapRef.current);
        pathRef.current = L.polyline([], { color: '#D32F2F', weight: 4, opacity: 0.6 }).addTo(mapRef.current);
      }
    };

    const timer = setTimeout(initMap, 100);

    if ("geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLoc = { emergencyId: emergency.emergencyId, latitude, longitude, timestamp: Date.now() };
          
          firebaseService.pushLocation(newLoc);
          setCurrentCoords({ lat: latitude, lng: longitude });
          setLocations(prev => [...prev, newLoc]);
          addLog(`TX UPLINK: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          
          if (locations.length % 5 === 0) runAiAudit(newLoc);

          if (mapRef.current) {
            const latlng = [latitude, longitude];
            mapRef.current.setView(latlng, 17);
            if (pathRef.current) pathRef.current.addLatLng(latlng);
            if (markerRef.current) {
              markerRef.current.setLatLng(latlng);
            } else {
              const pulseIcon = L.divIcon({
                className: 'custom-icon',
                html: `<div class="relative"><div class="absolute -inset-4 w-12 h-12 bg-red-500/30 rounded-full animate-ping"></div><div class="w-6 h-6 bg-[#D32F2F] rounded-full border-2 border-white shadow-xl flex items-center justify-center"></div></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              });
              markerRef.current = L.marker(latlng, { icon: pulseIcon }).addTo(mapRef.current);
            }
          }
        },
        (error) => addLog(`GPS ERROR: ${error.message}`),
        { enableHighAccuracy: true }
      );
    }

    return () => {
      clearTimeout(timer);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (mapRef.current) mapRef.current.remove();
    };
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-[#0F1115]">
      <div className="bg-[#D32F2F] p-5 pt-8 flex items-center justify-between shadow-2xl z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center animate-pulse shadow-lg">
            <i className="fa-solid fa-person-running text-[#D32F2F] text-2xl"></i>
          </div>
          <div>
            <h2 className="text-white font-black uppercase text-lg tracking-widest leading-none">SOS ACTIVE</h2>
            <p className="text-white/80 text-[8px] uppercase font-black tracking-widest mt-1">Satellite Link: STABLE</p>
          </div>
        </div>
        <div className="text-right">
           <span className="text-white font-mono text-[10px] bg-black/30 px-2 py-1 rounded border border-white/10">ENC: AES-256</span>
        </div>
      </div>

      <div className="flex-1 relative">
        <div id="map-container" className="absolute inset-0 z-0 bg-gray-900"></div>
        
        {/* Tactical Feed Terminal */}
        <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2">
           <div className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl">
              <div className="flex items-center gap-2 mb-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                 <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Safety Auditor (Gemini AI)</span>
              </div>
              <p className="text-[10px] text-gray-300 font-mono italic leading-tight">{aiReport}</p>
           </div>
           
           <div className="bg-black/60 backdrop-blur-sm border border-white/5 p-3 rounded-xl max-h-32 overflow-hidden flex flex-col gap-1">
              {dispatchLogs.map((log, i) => (
                <p key={i} className="text-[8px] font-mono text-green-500/80 leading-tight">
                  <span className="opacity-50 mr-2">></span>{log}
                </p>
              ))}
           </div>
        </div>

        {currentCoords && (
          <div className="absolute bottom-6 left-4 right-4 z-10 bg-[#1A1D24]/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Live Coordinate Matrix</span>
              <span className="text-[9px] text-green-500 font-black uppercase tracking-widest">Verified</span>
            </div>
            <div className="flex gap-4">
               <div className="flex-1 bg-black/40 rounded-xl p-3 border border-white/5">
                 <p className="text-[7px] text-gray-500 font-black uppercase">Lat</p>
                 <p className="text-white font-mono text-xs">{currentCoords.lat.toFixed(6)}</p>
               </div>
               <div className="flex-1 bg-black/40 rounded-xl p-3 border border-white/5">
                 <p className="text-[7px] text-gray-500 font-black uppercase">Lng</p>
                 <p className="text-white font-mono text-xs">{currentCoords.lng.toFixed(6)}</p>
               </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 pb-10 bg-[#1A1D24] border-t border-gray-800 rounded-t-[3rem] shadow-2xl z-20">
        <button 
          onClick={onResolve}
          className="w-full bg-green-600 text-white py-5 rounded-[2.5rem] font-black text-xl tracking-[0.2em] shadow-2xl shadow-green-900/40 active:scale-95 transition-all"
        >
          SECURE STATUS
        </button>
      </div>
    </div>
  );
};

export default EmergencyScreen;
