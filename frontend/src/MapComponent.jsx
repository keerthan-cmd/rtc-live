import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import STOPS_DATA from "./data/stops.json";
import STOPS_TE from "./data/stops_te.json";
import ROUTES_DATA from "./data/routes_data.json";

// Premium Icons
const createDotIcon = (color) => new L.divIcon({
  className: "custom-dot-icon",
  html: `<div style="width: 16px; height: 16px; background-color: ${color}; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const createPinIcon = (color) => new L.divIcon({
  className: "custom-pin-icon",
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="32" height="42" style="filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.3));">
      <path fill="${color}" d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>
    </svg>
  `,
  iconSize: [32, 42],
  iconAnchor: [16, 42]
});

const startIcon = createDotIcon('#10b981');
const endIcon = createPinIcon('#ea4335');

// Dynamic Color generator for buses
const getBusColor = (busId) => {
  const colors = ['#f43f5e', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
  let hash = 0;
  for (let i = 0; i < busId.length; i++) hash = busId.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// Dynamic Bus Icon
const createDynamicBusIcon = (color) => new L.divIcon({
  className: "custom-bus-icon",
  html: `
    <div style="width: 24px; height: 48px; background: ${color}; border-radius: 6px; position: relative; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 4px 0; border: 2px solid #000;">
      <div style="width: 16px; height: 8px; background: #333; border-radius: 2px;"></div>
      <div style="width: 24px; height: 2px; background: rgba(255,255,255,0.2);"></div>
      <div style="width: 16px; height: 8px; background: #facc15; border-radius: 2px;"></div>
    </div>
  `,
  iconSize: [24, 48],
  iconAnchor: [12, 24]
});

const emergencyBusIconCache = new L.divIcon({
  className: "custom-bus-icon pulse-red",
  html: `<div style="width: 24px; height: 48px; background: #E31E24; border-radius: 6px; position: relative; box-shadow: 0 0 15px rgba(227,30,36,0.8); display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 4px 0; border: 2px solid #000;">
    <div style="width: 16px; height: 8px; background: #333; border-radius: 2px;"></div>
    <div style="width: 24px; height: 2px; background: rgba(255,255,255,0.2);"></div>
    <div style="width: 16px; height: 8px; background: #facc15; border-radius: 2px;"></div>
  </div>`,
  iconSize: [24, 48],
  iconAnchor: [12, 24]
});

// Cache for bus icons
const busIconCache = {};
const getIconForBus = (busId, isEmergency) => {
  if (isEmergency) {
    return emergencyBusIconCache;
  }

  if (!busIconCache[busId]) {
    busIconCache[busId] = createDynamicBusIcon(getBusColor(busId));
  }
  return busIconCache[busId];
};

function MapUpdater({ center, zoom, bounds }) {
  const map = useMap();
  const centerStr = center ? center.join(',') : '';
  const boundsStr = bounds ? bounds.toBBoxString() : '';
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    } else {
      map.setView(center, zoom, { animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerStr, zoom, boundsStr, map]);
  return null;
}

function RecenterButton({ center, zoom, bounds }) {
  const map = useMap();
  const handleRecenter = (e) => {
    e.stopPropagation();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          map.setView([position.coords.latitude, position.coords.longitude], 15, { animate: true });
        },
        (error) => {
          console.warn("Recenter error:", error);
          if (bounds) map.fitBounds(bounds, { padding: [50, 50], animate: true });
          else map.setView(center, zoom, { animate: true });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      if (bounds) map.fitBounds(bounds, { padding: [50, 50], animate: true });
      else map.setView(center, zoom, { animate: true });
    }
  };

  return (
    <button 
      onClick={handleRecenter}
      style={{
        position: 'absolute',
        bottom: '100px', 
        right: '24px',
        zIndex: 1000,
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        backgroundColor: 'var(--clean-white, #FFFFFF)',
        color: 'var(--text-main, #333333)',
        border: 'none',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s',
        fontSize: '18px'
      }}
      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      title="Recenter Map"
    >
      <i className="fa-solid fa-location-crosshairs"></i>
    </button>
  );
}

export default function MapComponent({ boardingPoint, destination, routeConfirmed, selectedBusId, buses = {}, lang = 'en', userLocation, activePanel, transportMode = 'driving' }) {
  const [osrmRoute, setOsrmRoute] = useState([]);
  
  const mapCenter = STOPS_DATA[boardingPoint] || (userLocation ? userLocation : [17.7285, 83.2573]);
  
  let currentRoute = [];
  let mapBounds = null;

  // Compute the basic stop coordinates
  if (activePanel === 'near-me' && userLocation) {
    if (selectedBusId && buses[selectedBusId]) {
      mapBounds = L.latLngBounds([userLocation, [buses[selectedBusId].lat, buses[selectedBusId].lng]]);
    } else {
      mapBounds = L.latLngBounds([userLocation, userLocation]);
    }
  } else if (routeConfirmed && boardingPoint && destination && STOPS_DATA[boardingPoint] && STOPS_DATA[destination]) {
    let selectedPath = [];
    
    for (const [, stopsArray] of Object.entries(ROUTES_DATA)) {
      const idxStart = stopsArray.indexOf(boardingPoint);
      const idxEnd = stopsArray.indexOf(destination);
      
      if (idxStart !== -1 && idxEnd !== -1) {
        let isReversed = idxStart > idxEnd;
        let startBound = isReversed ? idxEnd : idxStart;
        let endBound = isReversed ? idxStart : idxEnd;
        
        let pathStops = stopsArray.slice(startBound, endBound + 1);
        if (isReversed) pathStops.reverse();
        
        selectedPath = pathStops.map(s => STOPS_DATA[s]).filter(Boolean);
        if (selectedPath.length > 1) {
            break;
        }
      }
    }
    
    if (selectedPath.length > 1) {
        currentRoute = selectedPath;
        mapBounds = L.latLngBounds(selectedPath);
    } else {
        currentRoute = [STOPS_DATA[boardingPoint], STOPS_DATA[destination]];
        mapBounds = L.latLngBounds([STOPS_DATA[boardingPoint], STOPS_DATA[destination]]);
    }
  }

  // Fetch OSRM Road Path (Either Bus->User or User->Dest)
  useEffect(() => {
    if (activePanel === 'near-me' && selectedBusId && buses[selectedBusId] && userLocation) {
      // Draw path from moving bus to user location
      const bus = buses[selectedBusId];
      const start = [bus.lat, bus.lng];
      const end = userLocation;
      
      const coordsString = `${start[1]},${start[0]};${end[1]},${end[0]}`;
      const url = `https://router.project-osrm.org/route/v1/${transportMode}/${coordsString}?overview=full&geometries=geojson`;
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
           if (data.routes && data.routes.length > 0) {
             const coords = data.routes[0].geometry.coordinates;
             setOsrmRoute(coords.map(c => [c[1], c[0]]));
           } else {
             setOsrmRoute([start, end]);
           }
        })
        .catch(err => {
          console.error("OSRM error:", err);
          setOsrmRoute([start, end]);
        });
        
    } else if (routeConfirmed && selectedBusId && buses[selectedBusId] && boardingPoint && STOPS_DATA[boardingPoint]) {
      // Draw path from moving bus to user
      const bus = buses[selectedBusId];
      const start = [bus.lat, bus.lng];
      const end = STOPS_DATA[boardingPoint];
      
      const coordsString = `${start[1]},${start[0]};${end[1]},${end[0]}`;
      const url = `https://router.project-osrm.org/route/v1/${transportMode}/${coordsString}?overview=full&geometries=geojson`;
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
           if (data.routes && data.routes.length > 0) {
             const coords = data.routes[0].geometry.coordinates;
             setOsrmRoute(coords.map(c => [c[1], c[0]]));
           } else {
             setOsrmRoute([start, end]);
           }
        })
        .catch(err => {
          console.error("OSRM error:", err);
          setOsrmRoute([start, end]);
        });
        
    } else if (routeConfirmed && currentRoute.length >= 2) {
      // Draw path from user to destination
      const coordsString = currentRoute.map(p => `${p[1]},${p[0]}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/${transportMode}/${coordsString}?overview=full&geometries=geojson`;
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
           if (data.routes && data.routes.length > 0) {
             const coords = data.routes[0].geometry.coordinates;
             setOsrmRoute(coords.map(c => [c[1], c[0]]));
           } else {
             setOsrmRoute(currentRoute);
           }
        })
        .catch(err => {
          console.error("OSRM error:", err);
          setOsrmRoute(currentRoute);
        });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOsrmRoute([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeConfirmed, boardingPoint, destination, selectedBusId, activePanel, userLocation, transportMode]);

  const polylineColor = selectedBusId ? getBusColor(selectedBusId) : "#000000";

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <style>{`
        .leaflet-container { background: transparent !important; }
        .leaflet-control-attribution { display: none !important; }
        .premium-popup .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); padding: 0; background: var(--clean-white); color: var(--text-main); }
        .premium-popup .leaflet-popup-content { margin: 12px 16px; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; text-align: center; }
        .premium-popup .leaflet-popup-tip { box-shadow: none; background: var(--clean-white); }
        @keyframes redPulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        .pulse-red { animation: redPulse 1.5s infinite; }
        
        .dark-theme .leaflet-layer,
        .dark-theme .leaflet-control-zoom-in,
        .dark-theme .leaflet-control-zoom-out,
        .dark-theme .leaflet-control-attribution {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
      `}</style>
      
      <MapContainer 
        center={mapCenter} 
        zoom={13} 
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <MapUpdater center={mapCenter} zoom={13} bounds={mapBounds} />
        <RecenterButton center={userLocation || mapCenter} zoom={userLocation ? 15 : 13} bounds={userLocation ? null : mapBounds} />
        
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
        />
        
        {((routeConfirmed && osrmRoute.length >= 2) || (activePanel === 'near-me' && osrmRoute.length >= 2)) && (
          <Polyline 
            positions={osrmRoute} 
            color={polylineColor} 
            weight={6} 
            opacity={0.8} 
          />
        )}
        
        {activePanel !== 'near-me' && boardingPoint && STOPS_DATA[boardingPoint] && (
          <Marker position={STOPS_DATA[boardingPoint]} icon={startIcon}>
            <Popup className="premium-popup">{lang === 'te' ? 'పికప్' : 'Pickup'}: {lang === 'te' && STOPS_TE[boardingPoint] ? STOPS_TE[boardingPoint] : boardingPoint}</Popup>
          </Marker>
        )}
        
        {activePanel === 'near-me' && userLocation && (
          <Marker position={userLocation} icon={startIcon}>
            <Popup className="premium-popup">{lang === 'te' ? 'మీ స్థానం' : 'Your Location'}</Popup>
          </Marker>
        )}
        
        {destination && STOPS_DATA[destination] && (
          <Marker position={STOPS_DATA[destination]} icon={endIcon}>
            <Popup className="premium-popup">{lang === 'te' ? 'డ్రాప్-ఆఫ్' : 'Drop-off'}: {lang === 'te' && STOPS_TE[destination] ? STOPS_TE[destination] : destination}</Popup>
          </Marker>
        )}

        {Object.entries(buses).map(([busId, busData]) => (
          <Marker key={busId} position={[busData.lat, busData.lng]} icon={getIconForBus(busId, busData.alert)}>
            <Popup className="premium-popup">
              {lang === 'te' ? 'రూట్' : 'Route'} {busData.routeId} <br/>
              <span style={{color: busData.alert ? '#E31E24' : getBusColor(busId), fontSize: '12px'}}>
                {busData.alert ? (lang === 'te' ? 'భారీ ట్రాఫిక్' : 'HEAVY TRAFFIC') : (lang === 'te' ? 'లైవ్ లొకేషన్' : 'Live Location')}
              </span>
              <br/>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {lang === 'te' ? 'రద్దీ' : 'Crowd'}: <strong style={{ color: busData.occupancy === 'Empty' ? '#10b981' : busData.occupancy === 'Full' ? '#E31E24' : '#f59e0b' }}>
                  {busData.occupancy === 'Empty' ? (lang === 'te' ? 'ఖాళీ' : 'Empty') : busData.occupancy === 'Full' ? (lang === 'te' ? 'పూర్తి' : 'Full') : (lang === 'te' ? 'మధ్యస్థం' : 'Moderate')}
                </strong>
              </span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}