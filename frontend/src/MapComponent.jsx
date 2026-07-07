import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { database, ref, onValue } from "./firebase";

// Animated Pulsing Dot Icon for Live Buses
const pulsingIcon = new L.divIcon({
  className: "custom-pulsing-icon",
  html: `<div class="pulse-ring"></div><div class="pulse-dot"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Real-world simulated route (Gajuwaka to RTC Complex)
const routePath = [
  [17.6896, 83.2086], // Gajuwaka
  [17.7011, 83.2154], // Sheela Nagar
  [17.7126, 83.2268], // BHPV
  [17.7215, 83.2421], // Airport Rd
  [17.7285, 83.2573], // NAD
  [17.7342, 83.2751], // Kancharapalem
  [17.7261, 83.3042], // Maddilapalem
  [17.7111, 83.3197]  // RTC Complex
];

export default function MapComponent() {
  const [buses, setBuses] = useState({});

  useEffect(() => {
    // Listen to Firebase for live bus locations
    const busesRef = ref(database, 'buses');
    onValue(busesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setBuses(data);
      } else {
        setBuses({});
      }
    });
  }, []);

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <style>{`
        .custom-pulsing-icon { display: flex; align-items: center; justify-content: center; }
        .pulse-ring {
          position: absolute; width: 40px; height: 40px; background-color: rgba(16, 185, 129, 0.4);
          border-radius: 50%; animation: pulse-anim 1.5s ease-out infinite;
        }
        .pulse-dot { position: absolute; width: 14px; height: 14px; background-color: #10b981; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
        @keyframes pulse-anim { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
        .leaflet-container { background: #0f172a !important; }
      `}</style>
      <MapContainer 
        center={[17.7285, 83.2573]} 
        zoom={12} 
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        <Polyline 
          positions={routePath} 
          color="#3b82f6" 
          weight={4} 
          opacity={0.8} 
        />
        
        {Object.entries(buses).map(([busNumber, busData]) => (
          <Marker key={busNumber} position={[busData.lat, busData.lng]} icon={pulsingIcon}>
            <Popup className="dark-popup">
              <div style={{ textAlign: "center", padding: '5px' }}>
                <b style={{ fontSize: "16px", color: '#0f172a' }}>Route {busNumber}</b><br/>
                <span style={{ color: "#10b981", fontWeight: "bold", fontSize: '12px' }}>● {busData.status || 'Active'}</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}