import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Initialize Google Maps with the dedicated key from environment variables
const initializeMaps = () => {
  // Use the dedicated Maps key if available, otherwise fallback to the primary API key
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.API_KEY;
  
  if (typeof (window as any).initGoogleMaps === 'function') {
    (window as any).initGoogleMaps(mapsKey || '');
  } else {
    setTimeout(() => {
      if (typeof (window as any).initGoogleMaps === 'function') {
        (window as any).initGoogleMaps(mapsKey || '');
      }
    }, 100);
  }
};

initializeMaps();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);