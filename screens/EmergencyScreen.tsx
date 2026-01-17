
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, EmergencyRecord, LocationUpdate } from '../types';
import { firebaseService } from '../firebase';

declare const L: any;

interface EmergencyScreenProps {
  user: UserProfile;
  emergency: EmergencyRecord;
  onResolve: () => void;
}

const EmergencyScreen: React.FC<EmergencyScreenProps> = ({ user, emergency, onResolve }) => {
  const [locations, setLocations] = useState<LocationUpdate[]>([]);
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const pathRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const [smsDeliveryReceipts, setSmsDeliveryReceipts] = useState<{name: string, status: string}[]>([]);

  useEffect(() => {
    // SMS Simulation on Emergency Start
    const contacts = firebaseService.getContacts(user.userId);
    setSmsDeliveryReceipts(contacts.map(c => ({ name: c.name, status: 'DELIVERED' })));

    // Initialize Map with a delay to ensure the container is ready
    const initMap = () => {
      const container = document.getElementById('map-container');
      if (container && !mapRef.current) {
        mapRef.current = L.map('map-container', {
          zoomControl: false,
          attributionControl: false,
          dragging: true,
          touchZoom: true
        }).setView([0, 0], 2);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19
        }).addTo(mapRef.current);

        pathRef.current = L.polyline([], { color: '#D32F2F', weight: 4, opacity: 0.6 }).addTo(mapRef.current);
      }
    };

    const timer = setTimeout(initMap, 100);

    // Geolocation Tracking
    if ("geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const newLoc = { emergencyId: emergency.emergencyId, latitude, longitude, timestamp: Date.now() };
          
          firebaseService.pushLocation(newLoc);
          setCurrentCoords({ lat: latitude, lng: longitude });
          setLocations(prev => [...prev, newLoc]);

          if (mapRef.current) {
            const latlng = [latitude, longitude];
            mapRef.current.setView(latlng, 17);
            
            // Update Path
            if (pathRef.current) {
              pathRef.current.addLatLng(latlng);
            }

            // Update Marker
            if (markerRef.current) {
              markerRef.current.setLatLng(latlng);
            } else {
              const pulseIcon = L.divIcon({
                className: 'custom-icon',
                html: `<div class="relative">
                        <div class="absolute -inset-4 w-12 h-12 bg-red-500/30 rounded-full animate-ping"></div>
                        <div class="w-6 h-6 bg-[#D32F2F] rounded-full border-2 border-white shadow-xl flex items-center justify-center">
                          <div class="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                       </div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              });
              markerRef.current = L.marker(latlng, { icon: pulseIcon }).addTo(mapRef.current);
            }
          }
        },
        (error) => {
          console.error("GPS SIGNAL LOST:", error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      clearTimeout(timer);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [emergency.emergencyId, user.userId]);

  return (
    <div className="flex flex-col h-full w-full bg-[#0F1115]">
      {/* Dynamic Alert Header */}
      <div className="bg-[#D32F2F] p-5 pt-8 flex items-center justify-between shadow-[0_4px_30px_rgba(211,47,47,0.3)] z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center animate-pulse shadow-lg">
            <i className="fa-solid fa-person-running text-[#D32F2F] text-2xl"></i>
          </div>
          <div>
            <h2 className="text-white font-black uppercase text-lg tracking-widest leading-none">SOS ACTIVE</h2>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              <p className="text-white/80 text-[10px] uppercase font-black tracking-tighter">Live Broadcast Initiated</p>
            </div>
          </div>
        </div>
        <div className="text-right">
           <div className="text-white font-mono text-[10px] bg-black/30 px-2 py-1 rounded border border-white/10">ID: {emergency.emergencyId.substr(-8)}</div>
        </div>
      </div>

      {/* Map Content Area */}
      <div className="flex-1 relative">
        <div id="map-container" className="absolute inset-0 z-0 bg-gray-900"></div>
        
        {/* SMS Delivery Receipts List */}
        <div className="absolute top-4 left-4 right-4 z-10 space-y-2 pointer-events-none">
          {smsDeliveryReceipts.map((receipt, i) => (
            <div key={i} className="bg-green-500/90 backdrop-blur-md text-white text-[10px] font-black px-4 py-2 rounded-xl flex items-center justify-between shadow-2xl animate-slide-in-left">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-comment-sms"></i>
                <span>SMS TO {receipt.name.toUpperCase()}</span>
              </div>
              <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded">{receipt.status}</span>
            </div>
          ))}
          {smsDeliveryReceipts.length === 0 && (
            <div className="bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-2xl animate-pulse">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>WARNING: NO TRUSTED CONTACTS SET</span>
            </div>
          )}
        </div>

        {/* Telemetry & GPS Stats */}
        {currentCoords && (
          <div className="absolute bottom-6 left-4 right-4 z-10 bg-[#1A1D24]/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.9)]">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">GPS Tracking Active</span>
              </div>
              <span className="text-[10px] text-white font-black bg-[#D32F2F] px-4 py-1.5 rounded-full shadow-lg">PRECISION LOCK</span>
            </div>
            
            <div className="flex gap-4">
               <div className="flex-1 bg-black/40 rounded-2xl p-3 border border-white/5">
                 <p className="text-[8px] text-gray-500 font-black uppercase mb-1">LAT</p>
                 <p className="text-white font-mono text-sm font-bold">{currentCoords.lat.toFixed(6)}</p>
               </div>
               <div className="flex-1 bg-black/40 rounded-2xl p-3 border border-white/5">
                 <p className="text-[8px] text-gray-500 font-black uppercase mb-1">LNG</p>
                 <p className="text-white font-mono text-sm font-bold">{currentCoords.lng.toFixed(6)}</p>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Emergency Action Controls */}
      <div className="p-8 pb-10 bg-[#1A1D24] border-t border-gray-800 rounded-t-[3rem] shadow-[0_-15px_50px_rgba(0,0,0,0.8)] z-20">
        <div className="flex items-center justify-between mb-8 px-2">
           <div className="flex flex-col items-center gap-1">
             <div className="w-10 h-10 bg-gray-900 rounded-2xl flex items-center justify-center border border-gray-800">
               <i className="fa-solid fa-signal text-blue-500 text-sm"></i>
             </div>
             <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Uplink OK</span>
           </div>
           <div className="flex flex-col items-center gap-1">
             <div className="w-10 h-10 bg-gray-900 rounded-2xl flex items-center justify-center border border-gray-800">
               <i className="fa-solid fa-shield-virus text-red-500 text-sm"></i>
             </div>
             <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">SOS Loop</span>
           </div>
           <div className="flex flex-col items-center gap-1">
             <div className="w-10 h-10 bg-gray-900 rounded-2xl flex items-center justify-center border border-gray-800">
               <i className="fa-solid fa-battery-three-quarters text-green-500 text-sm"></i>
             </div>
             <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Power Opt</span>
           </div>
        </div>

        <button 
          onClick={onResolve}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-5 rounded-[2.5rem] font-black text-xl tracking-[0.25em] shadow-2xl shadow-green-900/30 transition-all active:scale-95 flex items-center justify-center gap-4 group"
        >
          <i className="fa-solid fa-check-double text-2xl group-hover:scale-110 transition-transform"></i>
          SECURE STATUS
        </button>
        
        <p className="text-center text-[10px] text-gray-600 font-black uppercase tracking-[0.3em] mt-8 opacity-60">
          Tracking feed stops only on secure confirmation
        </p>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-left { animation: slideInLeft 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>
    </div>
  );
};

export default EmergencyScreen;
