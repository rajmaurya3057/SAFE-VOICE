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
  const [aiReport, setAiReport] = useState<string>("Verifying Signal...");
  
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const pathRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });
    setDispatchLogs(prev => [`${time} > ${msg}`, ...prev].slice(0, 4));
  };

  const runAiAudit = async (loc: LocationUpdate) => {
    try {
      if (!process.env.API_KEY || process.env.API_KEY === '') return;
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Status brief (5 words max) for SOS at ${loc.latitude}, ${loc.longitude}. Focus: Tactical stability.`
      });
      setAiReport(response.text?.trim() || "Active Tracking");
    } catch (e) {
      setAiReport("Audit Node Active");
    }
  };

  useEffect(() => {
    addLog("SOS BROADCAST INITIATED");
    const initMap = () => {
      const container = document.getElementById('map-container');
      if (container && !mapRef.current) {
        mapRef.current = L.map('map-container', {
          zoomControl: false,
          attributionControl: false
        }).setView([0, 0], 2);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapRef.current);
        pathRef.current = L.polyline([], { color: '#D32F2F', weight: 4, opacity: 0.6 }).addTo(mapRef.current);
      }
    };

    setTimeout(initMap, 100);

    if ("geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLoc = { emergencyId: emergency.emergencyId, latitude, longitude, timestamp: Date.now() };
          firebaseService.pushLocation(newLoc);
          setCurrentCoords({ lat: latitude, lng: longitude });
          setLocations(prev => {
            const next = [...prev, newLoc];
            if (next.length === 1 || next.length % 8 === 0) runAiAudit(newLoc);
            return next;
          });
          if (mapRef.current) {
            const latlng = [latitude, longitude];
            mapRef.current.setView(latlng, 17);
            if (pathRef.current) pathRef.current.addLatLng(latlng);
            if (!markerRef.current) {
              const icon = L.divIcon({
                className: 'm-0',
                html: `<div class="w-6 h-6 bg-[#D32F2F] rounded-full border-2 border-white shadow-[0_0_20px_#D32F2F] animate-pulse"></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              });
              markerRef.current = L.marker(latlng, { icon }).addTo(mapRef.current);
            } else {
              markerRef.current.setLatLng(latlng);
            }
          }
        },
        null,
        { enableHighAccuracy: true }
      );
    }
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (mapRef.current) mapRef.current.remove();
    };
  }, [emergency.emergencyId]);

  return (
    <div className="relative h-full w-full bg-[#0F1115] overflow-hidden">
      {/* Background Map - Zero Occlusion */}
      <div id="map-container" className="absolute inset-0 z-0"></div>

      {/* Top Floating HUD */}
      <div className="absolute top-10 left-4 right-4 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="flex justify-between items-center bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-3 pointer-events-auto">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-lg animate-pulse">
                <i className="fa-solid fa-satellite-dish text-white text-xs"></i>
             </div>
             <div>
               <h2 className="text-white font-black text-[10px] uppercase tracking-widest">SOS ACTIVE</h2>
               <p className="text-white/50 text-[7px] font-mono">ID: {emergency.emergencyId.slice(-6)}</p>
             </div>
          </div>
          <div className="text-right">
             <p className="text-blue-400 font-black text-[8px] uppercase tracking-tighter italic">{aiReport}</p>
             <p className="text-emerald-500 font-mono text-[7px] mt-0.5">STREAMING LIVE</p>
          </div>
        </div>

        {/* Floating Mini Logs */}
        <div className="w-3/4 bg-black/30 backdrop-blur-sm border-l-2 border-red-500/50 p-2 rounded-r-xl">
           {dispatchLogs.map((log, i) => (
             <p key={i} className="text-[7px] font-mono text-white/60 leading-tight mb-0.5 truncate">{log}</p>
           ))}
        </div>
      </div>

      {/* Bottom Docked Controls */}
      <div className="absolute bottom-8 left-6 right-6 z-10 space-y-4">
        {currentCoords && (
          <div className="flex justify-center">
            <div className="bg-black/60 backdrop-blur-xl border border-white/5 px-4 py-2 rounded-full flex gap-4 shadow-2xl">
              <div className="flex items-center gap-2">
                <span className="text-[7px] text-gray-500 font-black uppercase">LAT</span>
                <span className="text-white font-mono text-[9px]">{currentCoords.lat.toFixed(5)}</span>
              </div>
              <div className="w-px h-3 bg-white/10 my-auto"></div>
              <div className="flex items-center gap-2">
                <span className="text-[7px] text-gray-500 font-black uppercase">LNG</span>
                <span className="text-white font-mono text-[9px]">{currentCoords.lng.toFixed(5)}</span>
              </div>
            </div>
          </div>
        )}

        <button 
          onClick={onResolve}
          className="w-full bg-[#10B981] hover:bg-emerald-400 text-white py-5 rounded-3xl font-black text-sm tracking-[0.3em] shadow-[0_15px_40px_rgba(16,185,129,0.3)] active:scale-95 transition-all uppercase"
        >
          Mark as Safe
        </button>
      </div>
    </div>
  );
};

export default EmergencyScreen;