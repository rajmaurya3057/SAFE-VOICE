import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Initialize Google Maps with the key from environment variables
const initializeMaps = () => {
  const apiKey = process.env.API_KEY;
  
  // Call the loader hook defined in index.html
  if (typeof (window as any).initGoogleMaps === 'function') {
    (window as any).initGoogleMaps(apiKey || '');
  } else {
    // Fail-safe retry if DOM is still mounting
    setTimeout(() => {
      if (typeof (window as any).initGoogleMaps === 'function') {
        (window as any).initGoogleMaps(apiKey || '');
      }
    }, 50);
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