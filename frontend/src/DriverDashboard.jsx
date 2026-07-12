import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { database, ref, set } from "./firebase";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import ROUTES_DATA from "./data/routes_data.json";
import STOPS_DATA from "./data/stops.json";

// Interpolate between points to make smooth movement for Mock GPS
function getInterpolatedPoint(p1, p2, fraction) {
  return [
    p1[0] + (p2[0] - p1[0]) * fraction,
    p1[1] + (p2[1] - p1[1]) * fraction
  ];
}

const busIcon = new L.divIcon({
  className: "custom-bus-icon",
  html: `<div style="width: 24px; height: 48px; background: #10b981; border-radius: 6px; border: 2px solid #000; box-shadow: 0 4px 10px rgba(0,0,0,0.4);"></div>`,
  iconSize: [24, 48],
  iconAnchor: [12, 24]
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function DriverDashboard() {
  const [busId, setBusId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [useMockGps, setUseMockGps] = useState(false);
  const [passengers, setPassengers] = useState(12);
  const [currentLoc, setCurrentLoc] = useState([17.7285, 83.2573]);
  const [gpsError, setGpsError] = useState("");
  const navigate = useNavigate();

  // Mock GPS state
  const mockState = useRef({ segment: 0, fraction: 0, dir: 1, speed: 0.05 });

  const handleLogout = () => {
    localStorage.removeItem("rtc_session");
    navigate("/");
  };

  useEffect(() => {
    let watchId = null;
    let mockInterval = null;

    if (isTracking && busId && routeId) {
      setGpsError("");

      if (useMockGps) {
        // --- MOCK GPS SIMULATION ---
        const stopNames = ROUTES_DATA[routeId];
        if (!stopNames || stopNames.length < 2) {
          setGpsError(`Route ${routeId} not found in database.`);
          setIsTracking(false);
          return;
        }
        
        const routePath = stopNames.map(name => STOPS_DATA[name]).filter(Boolean);
        
        mockInterval = setInterval(() => {
          let s = mockState.current;
          s.fraction += s.speed * s.dir;

          if (s.fraction >= 1) {
            s.fraction = 0;
            s.segment += s.dir;
            if (s.segment >= routePath.length - 1) {
              s.segment = routePath.length - 2;
              s.fraction = 1;
              s.dir = -1; // turnaround
            }
          } else if (s.fraction <= 0) {
            s.fraction = 1;
            s.segment += s.dir;
            if (s.segment < 0) {
              s.segment = 0;
              s.fraction = 0;
              s.dir = 1; // turnaround
            }
          }

          const p1 = routePath[s.segment];
          const p2 = routePath[s.segment + 1];
          if (p1 && p2) {
            const loc = getInterpolatedPoint(p1, p2, s.fraction);
            setCurrentLoc(loc);
            
            // Broadcast to Firebase
            set(ref(database, `buses/${busId}`), { 
              lat: loc[0], 
              lng: loc[1], 
              lastUpdated: Date.now(), 
              status: "Simulated",
              routeId: routeId,
              speed: s.speed,
              dir: s.dir
            });
          }
        }, 2000);

      } else {
        // --- REAL HARDWARE GPS ---
        if (!navigator.geolocation) { 
          setGpsError("GPS tracking not supported by this browser."); 
          setIsTracking(false); 
          return; 
        }

        // We removed the 'timeout' so it waits patiently for a GPS fix.
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const loc = [position.coords.latitude, position.coords.longitude];
            setCurrentLoc(loc);
            setGpsError("");
            
            // Broadcast to Firebase
            set(ref(database, `buses/${busId}`), { 
              lat: loc[0], 
              lng: loc[1], 
              lastUpdated: Date.now(), 
              status: "On Route",
              routeId: routeId,
              speed: 0.04, // Default assumed speed for ETA if we don't calculate real velocity
              dir: 1 // Default direction
            });
          },
          (error) => { 
            console.error("Geolocation Error:", error); 
            setGpsError(`Location error (${error.code}): ${error.message}`); 
            setIsTracking(false); 
          },
          { enableHighAccuracy: true, maximumAge: 0 } 
        );
      }

    } else if (!isTracking && busId) {
        set(ref(database, `buses/${busId}`), null); // Remove bus from map when offline
    }

    return () => { 
      if (watchId !== null) navigator.geolocation.clearWatch(watchId); 
      if (mockInterval !== null) clearInterval(mockInterval);
    };
  }, [isTracking, busId, routeId, useMockGps]);

  const toggleTracking = () => {
    if (!busId || !routeId) {
      alert("Please enter both Bus ID and Route Number.");
      return;
    }
    setIsTracking(!isTracking);
  };

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: 'white', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)', zIndex: 10 }}>
         <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '1px' }}>RTC <span style={{ color: '#10b981' }}>DRIVER</span></div>
         <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s' }}>Sign Out</button>
      </div>

      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        
        {/* Map Background */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
          <MapContainer center={currentLoc} zoom={15} style={{ width: '100%', height: '100%' }} zoomControl={false}>
            <MapUpdater center={currentLoc} />
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <Marker position={currentLoc} icon={busIcon}>
              <Popup>You are here</Popup>
            </Marker>
          </MapContainer>
        </div>
        
        {/* Map overlay gradient */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0) 40%, rgba(15, 23, 42, 1) 100%)', zIndex: 2, pointerEvents: 'none' }}></div>

        {/* Dashboard Control Panel */}
        <div style={{ zIndex: 3, marginTop: 'auto', width: '100%', padding: '20px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '600px', background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(20px)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
               <h2 style={{ margin: 0, fontSize: '32px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                 {isTracking ? <span style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981' }}></span> : <span style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%', boxShadow: '0 0 10px #ef4444' }}></span>}
                 {isTracking ? 'Broadcasting Live' : 'Offline'}
               </h2>
               <p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>{isTracking ? 'GPS location is active and sharing' : 'Enter details to start broadcasting'}</p>
            </div>

            {gpsError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '15px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', fontWeight: '600', textAlign: 'center' }}>
                <i className="fas fa-exclamation-triangle"></i> {gpsError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>Bus ID (License Plate)</label>
                <input 
                  type="text" 
                  placeholder="e.g. AP31X1234" 
                  value={busId} 
                  onChange={(e) => setBusId(e.target.value.toUpperCase())} 
                  disabled={isTracking} 
                  style={{ padding: '16px', fontSize: '16px', width: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(15, 23, 42, 0.5)', color: 'white', outline: 'none', fontWeight: 'bold', textTransform: 'uppercase', transition: 'border-color 0.2s' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>Route Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. 10A" 
                  value={routeId} 
                  onChange={(e) => setRouteId(e.target.value.toUpperCase())} 
                  disabled={isTracking} 
                  style={{ padding: '16px', fontSize: '16px', width: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(15, 23, 42, 0.5)', color: 'white', outline: 'none', fontWeight: 'bold', textTransform: 'uppercase', transition: 'border-color 0.2s' }} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '25px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: isTracking ? 'not-allowed' : 'pointer', color: '#94a3b8', fontWeight: '600', fontSize: '14px' }}>
                <input 
                  type="checkbox" 
                  checked={useMockGps} 
                  onChange={(e) => setUseMockGps(e.target.checked)}
                  disabled={isTracking}
                  style={{ marginRight: '8px', width: '18px', height: '18px', accentColor: '#10b981' }}
                />
                Enable Simulated GPS (Dev Mode)
              </label>
            </div>
            
            <button 
              onClick={toggleTracking} 
              style={{ 
                width: '100%', 
                padding: '20px', 
                backgroundColor: isTracking ? '#ef4444' : '#10b981', 
                color: 'white', 
                border: 'none', 
                borderRadius: '16px', 
                fontSize: '20px', 
                fontWeight: '900', 
                cursor: 'pointer', 
                textTransform: 'uppercase', 
                letterSpacing: '1px', 
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                boxShadow: isTracking ? '0 10px 25px rgba(239, 68, 68, 0.4)' : '0 10px 25px rgba(16, 185, 129, 0.4)' 
              }}
            >
              {isTracking ? "Stop Broadcasting" : "Start Broadcasting"}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
