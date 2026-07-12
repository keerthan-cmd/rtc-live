import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { database, ref, set } from "./firebase";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import ROUTES_DATA from "./data/routes_data.json";
import STOPS_DATA from "./data/stops.json";

function getInterpolatedPoint(p1, p2, fraction) {
  return [
    p1[0] + (p2[0] - p1[0]) * fraction,
    p1[1] + (p2[1] - p1[1]) * fraction
  ];
}

const busIcon = new L.divIcon({
  className: "custom-bus-icon",
  html: `<div style="width: 24px; height: 48px; background: #E31E24; border-radius: 6px; border: 2px solid #000; box-shadow: 0 4px 10px rgba(0,0,0,0.4);"></div>`,
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
  const [currentLoc, setCurrentLoc] = useState([17.7285, 83.2573]);
  const [gpsError, setGpsError] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [occupancy, setOccupancy] = useState("Moderate");
  const navigate = useNavigate();

  const mockState = useRef({ segment: 0, fraction: 0, dir: 1, speed: 0.05 });
  const isEmergencyRef = useRef(false);
  const occupancyRef = useRef("Moderate");

  // Sync state to ref for intervals
  useEffect(() => {
    isEmergencyRef.current = isEmergency;
  }, [isEmergency]);
  
  useEffect(() => {
    occupancyRef.current = occupancy;
  }, [occupancy]);

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
        const stopNames = ROUTES_DATA[routeId];
        if (!stopNames || stopNames.length < 2) {
          setGpsError(`Route ${routeId} not found in database.`);
          setIsTracking(false);
          return;
        }
        
        const baseStops = stopNames.map(name => STOPS_DATA[name]).filter(Boolean);
        let isUnmounted = false;
        
        const coordsString = baseStops.map(p => `${p[1]},${p[0]}`).join(';');
        fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`)
          .then(res => res.json())
          .then(data => {
            if (isUnmounted) return;
            let finalPath = baseStops;
            if (data.routes && data.routes.length > 0) {
              finalPath = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            }
            startMockInterval(finalPath);
          })
          .catch(() => {
            if (!isUnmounted) startMockInterval(baseStops);
          });

        function startMockInterval(finalPath) {
          mockState.current = { segment: 0, fraction: 0, dir: 1, speed: 0.15 }; 
          
          mockInterval = setInterval(() => {
            let s = mockState.current;
            s.fraction += s.speed * s.dir;

            if (s.fraction >= 1) {
              s.fraction = 0;
              s.segment += s.dir;
              if (s.segment >= finalPath.length - 1) {
                s.segment = finalPath.length - 2;
                s.fraction = 1;
                s.dir = -1;
              }
            } else if (s.fraction <= 0) {
              s.fraction = 1;
              s.segment += s.dir;
              if (s.segment < 0) {
                s.segment = 0;
                s.fraction = 0;
                s.dir = 1;
              }
            }

            const p1 = finalPath[s.segment];
            const p2 = finalPath[s.segment + 1];
            if (p1 && p2) {
              const loc = getInterpolatedPoint(p1, p2, s.fraction);
              setCurrentLoc(loc);
              
              set(ref(database, `buses/${busId}`), { 
                lat: loc[0], 
                lng: loc[1], 
                lastUpdated: Date.now(), 
                status: isEmergencyRef.current ? "Emergency" : "Simulated",
                routeId: routeId,
                speed: 0.05,
                dir: s.dir,
                alert: isEmergencyRef.current,
                occupancy: occupancyRef.current
              });
            }
          }, 1000);
        }

      } else {
        if (!navigator.geolocation) { 
          setGpsError("GPS tracking not supported by this browser."); 
          setIsTracking(false); 
          return; 
        }

        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const loc = [position.coords.latitude, position.coords.longitude];
            setCurrentLoc(loc);
            setGpsError("");
            
            set(ref(database, `buses/${busId}`), { 
              lat: loc[0], 
              lng: loc[1], 
              lastUpdated: Date.now(), 
              status: isEmergencyRef.current ? "Emergency" : "On Route",
              routeId: routeId,
              speed: 0.04, 
              dir: 1,
              alert: isEmergencyRef.current,
              occupancy: occupancyRef.current
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
        set(ref(database, `buses/${busId}`), null);
    }

    return () => { 
      if (typeof isUnmounted !== 'undefined') isUnmounted = true;
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
    <div className="app-wrapper">
      <style>{`
        :root {
            --rtc-red: #E31E24;
            --rtc-black: #141414;
            --clean-white: #FFFFFF;
            --off-white: #F8F9FA;
            --border-color: #EBEBEB;
            --text-main: #2D3436;
            --text-muted: #7F8C8D;
        }
        :root.dark-theme {
            --rtc-red: #FF4757;
            --rtc-black: #0F172A;
            --clean-white: #1E293B;
            --off-white: #0F172A;
            --border-color: #334155;
            --text-main: #F8FAFC;
            --text-muted: #94A3B8;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .app-wrapper { display: flex; width: 100vw; height: 100vh; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: var(--text-main); background: var(--off-white); overflow: hidden; }
        
        .sidebar-container { display: flex; width: 480px; height: 100%; background: var(--clean-white); border-right: 1px solid var(--border-color); z-index: 10; box-shadow: 4px 0 25px rgba(0,0,0,0.05); }
        .main-sidebar { width: 90px; height: 100%; background: var(--rtc-black); display: flex; flex-direction: column; align-items: center; padding: 20px 0; }
        
        .brand h2 { color: var(--clean-white); font-size: 1.4rem; font-weight: 800; text-align: center; }
        .brand span { color: var(--rtc-red); font-size: 0.8rem; font-weight: 700; letter-spacing: 2px; display: block; text-align: center; }
        
        .nav-menu { margin-top: 50px; display: flex; flex-direction: column; gap: 20px; width: 100%; }
        .nav-btn { background: transparent; border: none; color: var(--text-muted); padding: 15px 0; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; transition: all 0.3s ease; }
        .nav-btn i { font-size: 20px; }
        .nav-btn span { font-size: 0.7rem; font-weight: 600; }
        .nav-btn:hover, .nav-btn.active { color: var(--clean-white); background: rgba(255, 255, 255, 0.05); border-left: 4px solid var(--rtc-red); }
        
        .slide-panels { flex: 1; padding: 30px 20px; background: var(--clean-white); overflow-y: auto; }
        .panel-content { display: none; }
        .panel-content.active { display: block; animation: fadeIn 0.4s ease; }
        .panel-content h2 { font-size: 1.4rem; font-weight: 700; margin-bottom: 5px; }
        .panel-desc { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 15px; line-height: 1.4; }
        
        .input-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 15px; }
        .input-group label { font-size: 0.85rem; font-weight: 600; }
        .modern-select { padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--off-white); font-size: 0.95rem; outline: none; transition: border 0.2s; width: 100%; box-sizing: border-box; }
        .modern-select:focus { border-color: var(--rtc-red); }
        
        .action-btn { width: 100%; background: var(--rtc-black); color: var(--clean-white); border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; margin-top: 5px; font-size: 0.95rem; }
        .action-btn:hover { background: var(--rtc-red); }
        
        .slide-card-item { background: var(--clean-white); border: 1px solid var(--border-color); border-radius: 10px; padding: 15px; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease; }
        .card-meta h4 { font-size: 0.95rem; font-weight: 700; margin-bottom: 4px; }
        .card-meta p { font-size: 0.8rem; color: var(--text-muted); }
        
        .fullscreen-map { flex: 1; height: 100%; z-index: 1; position: relative; }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-5px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes redPulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); background: #ff4757; } 100% { transform: scale(1); } }
        .pulse-red-bg { animation: redPulse 1.2s infinite; }
        
        @media (max-width: 768px) {
            .app-wrapper { flex-direction: column-reverse; }
            .sidebar-container { width: 100%; height: 50vh; flex-direction: column; }
            .main-sidebar { width: 100%; height: auto; flex-direction: row; padding: 10px; justify-content: space-around; }
            .nav-menu { flex-direction: row; margin-top: 0; justify-content: space-around; gap: 5px; }
            .nav-btn { padding: 10px; }
            .nav-btn i { font-size: 18px; }
            .nav-btn span { font-size: 0.6rem; }
            .nav-btn:hover, .nav-btn.active { border-left: none; border-bottom: 4px solid var(--rtc-red); }
            .fullscreen-map { height: 50vh; }
            .slide-panels { padding: 15px; }
        }
        @keyframes pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(227, 30, 36, 0.7); } 70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(227, 30, 36, 0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(227, 30, 36, 0); } }
      `}</style>

      <aside className="sidebar-container">
        <div className="main-sidebar">
          <div className="brand"><h2>RTC</h2><span>DRIVER</span></div>
          <nav className="nav-menu">
            <button className="nav-btn active">
              <i className="fa-solid fa-satellite-dish"></i><span>Broadcast</span>
            </button>
            <button className="nav-btn" onClick={handleLogout}>
              <i className="fa-solid fa-sign-out-alt"></i><span>Logout</span>
            </button>
          </nav>
        </div>

        <div className="slide-panels">
          <div className="panel-content active">
             <h2>Broadcast Controls</h2>
             <p className="panel-desc">Start broadcasting your GPS location to the RTC network.</p>
             
             {gpsError && (
               <div style={{ background: '#FFF5F5', border: '1px solid #FEB2B2', color: '#C53030', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.85rem' }}>
                 {gpsError}
               </div>
             )}

             <div className="input-group">
                 <label>Bus ID (License Plate)</label>
                 <input className="modern-select" placeholder="e.g. AP31X1234" value={busId} onChange={(e) => setBusId(e.target.value.toUpperCase())} disabled={isTracking} />
             </div>
             
             <div className="input-group">
                 <label>Route Number</label>
                 <input className="modern-select" placeholder="e.g. 10A" value={routeId} onChange={(e) => setRouteId(e.target.value.toUpperCase())} disabled={isTracking} />
             </div>

             <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                <input type="checkbox" checked={useMockGps} onChange={(e) => setUseMockGps(e.target.checked)} disabled={isTracking} style={{ accentColor: 'var(--rtc-red)' }} />
                <label style={{ margin: 0 }}>Enable Simulated GPS (Dev Mode)</label>
             </div>

             <button 
               onClick={toggleTracking} 
               className="action-btn" 
               style={{ 
                 marginTop: '20px', 
                 backgroundColor: isTracking ? 'var(--rtc-red)' : 'var(--rtc-black)'
               }}
             >
               {isTracking ? "Stop Broadcasting" : "Start Broadcasting"}
             </button>

             {isTracking && (
               <>
                 <div className="slide-card-item" style={{ borderLeft: '4px solid #10b981', marginTop: '20px' }}>
                    <div className="card-meta">
                        <h4>Status: Live</h4>
                        <p>Broadcasting to network</p>
                    </div>
                    <i className="fa-solid fa-satellite-dish" style={{ color: '#10b981' }}></i>
                 </div>
                 
                 <div style={{ marginTop: '15px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Current Crowd Level</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                       <button onClick={() => setOccupancy("Empty")} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: occupancy === 'Empty' ? '2px solid #10b981' : '1px solid var(--border-color)', background: occupancy === 'Empty' ? 'rgba(16, 185, 129, 0.1)' : 'var(--off-white)', fontWeight: 'bold', color: occupancy === 'Empty' ? '#10b981' : 'var(--text-muted)', cursor: 'pointer' }}>Empty</button>
                       <button onClick={() => setOccupancy("Moderate")} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: occupancy === 'Moderate' ? '2px solid #f59e0b' : '1px solid var(--border-color)', background: occupancy === 'Moderate' ? 'rgba(245, 158, 11, 0.1)' : 'var(--off-white)', fontWeight: 'bold', color: occupancy === 'Moderate' ? '#f59e0b' : 'var(--text-muted)', cursor: 'pointer' }}>Mod</button>
                       <button onClick={() => setOccupancy("Full")} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: occupancy === 'Full' ? '2px solid var(--rtc-red)' : '1px solid var(--border-color)', background: occupancy === 'Full' ? 'rgba(227, 30, 36, 0.1)' : 'var(--off-white)', fontWeight: 'bold', color: occupancy === 'Full' ? 'var(--rtc-red)' : 'var(--text-muted)', cursor: 'pointer' }}>Full</button>
                    </div>
                 </div>
                 
                 <button 
                   onClick={() => setIsEmergency(!isEmergency)} 
                   className="action-btn" 
                   style={{ 
                     marginTop: '15px', 
                     backgroundColor: isEmergency ? 'var(--rtc-black)' : 'var(--rtc-red)',
                     animation: isEmergency ? 'pulse 2s infinite' : 'none'
                   }}
                 >
                   <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
                   {isEmergency ? "Cancel Emergency" : "Report Heavy Traffic / Emergency"}
                 </button>
               </>
             )}
          </div>
        </div>
      </aside>

      <main className="fullscreen-map">
        <MapContainer center={currentLoc} zoom={15} style={{ width: '100%', height: '100%' }} zoomControl={false}>
          <MapUpdater center={currentLoc} />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          <Marker position={currentLoc} icon={busIcon}>
            <Popup>You are here</Popup>
          </Marker>
        </MapContainer>
      </main>
    </div>
  );
}
