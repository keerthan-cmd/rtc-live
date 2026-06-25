import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { database, ref, onValue } from "./firebase";

// Load the bus icon
const busIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3448/3448339.png", 
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// This is the GPS path the bus will follow (Simulated Vizag Route)
const routePath = [
  [17.7231, 83.3012], 
  [17.7246, 83.3027],
  [17.7261, 83.3042],
  [17.7276, 83.3057],
  [17.7291, 83.3072],
  [17.7306, 83.3087]  
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
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <MapContainer 
        center={[17.7261, 83.3042]} 
        zoom={15} 
        style={{ height: "60vh", width: "100%", borderRadius: "15px", border: "4px solid #1e293b", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        
        {/* Draw the actual route line! */}
        <Polyline 
          positions={routePath} 
          color="#3b82f6" 
          weight={6} 
          opacity={0.8} 
          dashArray="10, 10" 
        />
        
        {/* Draw the live buses */}
        {Object.entries(buses).map(([busNumber, busData]) => (
          <Marker key={busNumber} position={[busData.lat, busData.lng]} icon={busIcon}>
            <Popup>
              <div style={{ textAlign: "center" }}>
                <b style={{ fontSize: "16px" }}>Bus {busNumber}</b><br/>
                <span style={{ color: "#16a34a", fontWeight: "bold" }}>● {busData.status}</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}