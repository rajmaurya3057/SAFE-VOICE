
import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-[#0F1115]">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full border-4 border-[#D32F2F] flex items-center justify-center animate-pulse">
          <i className="fa-solid fa-shield-heart text-5xl text-[#D32F2F]"></i>
        </div>
      </div>
      <h1 className="text-4xl font-bold tracking-widest text-white mb-2">SAFE-VOICE</h1>
      <p className="text-gray-400 text-sm uppercase tracking-[0.3em]">Protection. Presence. Peace.</p>
      
      <div className="absolute bottom-12 flex flex-col items-center">
        <div className="w-12 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className="w-full h-full bg-[#D32F2F] origin-left animate-[loading_2s_ease-in-out_infinite]"></div>
        </div>
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: scaleX(0); }
          50% { transform: scaleX(1); }
          100% { transform: scaleX(0); transform-origin: right; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
