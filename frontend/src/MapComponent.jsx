import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { database, ref, onValue } from "./firebase";

// Coordinates for stops
const STOPS = {
  "Gajuwaka": [17.6896, 83.2086],
  "NAD": [17.7285, 83.2573],
  "RTC Complex": [17.7111, 83.3197],
  "Maddilapalem": [17.7261, 83.3042],
};

// Premium Icons
const createDotIcon = (color) => new L.divIcon({
  className: "custom-dot-icon",
  html: `<div style="width: 16px; height: 16px; background-color: ${color}; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const createSquareIcon = (color) => new L.divIcon({
  className: "custom-square-icon",
  html: `<div style="width: 16px; height: 16px; background-color: ${color}; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const startIcon = createDotIcon('#10b981');
const endIcon = createSquareIcon('#000000');

// Top-down Bus Icon
const busIcon = new L.divIcon({
  className: "custom-bus-icon",
  html: `
    <div style="width: 24px; height: 48px; background: #000; border-radius: 6px; position: relative; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 4px 0;">
      <div style="width: 16px; height: 8px; background: #333; border-radius: 2px;"></div>
      <div style="width: 24px; height: 2px; background: rgba(255,255,255,0.2);"></div>
      <div style="width: 16px; height: 8px; background: #facc15; border-radius: 2px;"></div>
    </div>
  `,
  iconSize: [24, 48],
  iconAnchor: [12, 24]
});

function MapUpdater({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    } else {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, bounds, map]);
  return null;
}

export default function MapComponent({ boardingPoint, destination, routeConfirmed }) {
  const [buses, setBuses] = useState({});
  const [animatedPos, setAnimatedPos] = useState(null);
  
  const mapCenter = STOPS[boardingPoint] || [17.7285, 83.2573];
  
  let currentRoute = [];
  let mapBounds = null;

  if (routeConfirmed && boardingPoint && destination && STOPS[boardingPoint] && STOPS[destination]) {
    currentRoute = [STOPS[boardingPoint], STOPS[destination]];
    mapBounds = L.latLngBounds([STOPS[boardingPoint], STOPS[destination]]);
  }

  // Simulate bus movement along the route if confirmed
  useEffect(() => {
    let interval;
    if (routeConfirmed && currentRoute.length === 2) {
      const [start, end] = currentRoute;
      let progress = 0;
      setAnimatedPos(start);
      
      interval = setInterval(() => {
        progress += 0.015; // smooth progress
        if (progress > 1) {
          progress = 1;
          clearInterval(interval);
        }
        const lat = start[0] + (end[0] - start[0]) * progress;
        const lng = start[1] + (end[1] - start[1]) * progress;
        setAnimatedPos([lat, lng]);
      }, 300);
    } else {
      setAnimatedPos(null);
    }
    
    return () => { if (interval) clearInterval(interval); };
  }, [routeConfirmed, boardingPoint, destination]);

  useEffect(() => {
    const busesRef = ref(database, 'buses');
    onValue(busesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setBuses(data);
      else setBuses({});
    });
  }, []);

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <style>{`
        .leaflet-container { background: #e5e7eb !important; }
        .leaflet-control-attribution { display: none !important; }
        .premium-popup .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); padding: 0; }
        .premium-popup .leaflet-popup-content { margin: 12px 16px; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; color: #0f172a; text-align: center; }
        .premium-popup .leaflet-popup-tip { box-shadow: none; }
      `}</style>
      
      <MapContainer 
        center={mapCenter} 
        zoom={13} 
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <MapUpdater center={mapCenter} zoom={13} bounds={mapBounds} />
        
        {/* Clean Light Map Style for premium feel */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {/* Solid Route Line */}
        {routeConfirmed && currentRoute.length === 2 && (
          <Polyline 
            positions={currentRoute} 
            color="#000000" 
            weight={5} 
            opacity={1} 
          />
        )}
        
        {boardingPoint && STOPS[boardingPoint] && (
          <Marker position={STOPS[boardingPoint]} icon={startIcon}>
            <Popup className="premium-popup">Pickup: {boardingPoint}</Popup>
          </Marker>
        )}
        
        {destination && STOPS[destination] && (
          <Marker position={STOPS[destination]} icon={endIcon}>
            <Popup className="premium-popup">Drop-off: {destination}</Popup>
          </Marker>
        )}

        {animatedPos && (
          <Marker position={animatedPos} icon={busIcon}>
            <Popup className="premium-popup">Your Ride is Arriving</Popup>
          </Marker>
        )}
        
        {/* Background active buses */}
        {!routeConfirmed && Object.entries(buses).map(([busNumber, busData]) => (
          <Marker key={busNumber} position={[busData.lat, busData.lng]} icon={busIcon}>
            <Popup className="premium-popup">
              Route {busNumber} <br/><span style={{color: '#10b981', fontSize: '12px'}}>Active</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}