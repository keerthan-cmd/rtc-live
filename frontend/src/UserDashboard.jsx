import { useState, useEffect, useMemo } from "react";
import MapComponent from "./MapComponent";
import AIChatWidget from "./AIChatWidget";
import STOPS_DATA from "./data/stops.json";
import ROUTES_DATA from "./data/routes_data.json";
import { database, ref, onValue } from "./firebase";

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2-lat1) * (Math.PI/180);
  const dLon = (lon2-lon1) * (Math.PI/180); 
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}

export default function UserDashboard({ userEmail, onLogout }) {
  const [activeScreen, setActiveScreen] = useState('home'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState('light');

  // Map state
  const [boardingPoint, setBoardingPoint] = useState('');
  const [destination, setDestination] = useState('');
  const [routeConfirmed, setRouteConfirmed] = useState(false);
  
  // Live Bus Data
  const [buses, setBuses] = useState({});
  const [selectedBusId, setSelectedBusId] = useState(null);
  
  // UI states for Bottom Sheet
  const [sheetState, setSheetState] = useState('half'); // 'hidden', 'half', 'full'
  const stopNames = Object.keys(STOPS_DATA || {}).sort();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Subscribe to live buses
  useEffect(() => {
    const busesRef = ref(database, 'buses');
    const unsubscribe = onValue(busesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setBuses(data);
      else setBuses({});
    });
    return () => unsubscribe();
  }, []);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const handleStartTracking = () => {
    if (!boardingPoint || !destination) {
      alert("Please select a boarding point and destination.");
      return;
    }
    setRouteConfirmed(true);
    setSheetState('half');
    setSelectedBusId(null);
  };

  const handleGoHome = () => {
    setActiveScreen('home');
    setBoardingPoint('');
    setDestination('');
    setRouteConfirmed(false);
    setSheetState('half');
    setSelectedBusId(null);
  };

  const navigateTo = (screen) => {
    setActiveScreen(screen);
    setIsSidebarOpen(false);
    if (screen === 'map') {
      setSheetState('half');
    }
  };

  // Calculate incoming buses dynamically
  const incomingBuses = useMemo(() => {
    if (!routeConfirmed || !boardingPoint || !destination) return [];
    
    const startCoords = STOPS_DATA[boardingPoint];
    if (!startCoords) return [];

    let validBuses = [];
    Object.values(buses).forEach(bus => {
      if (!bus.routeId || !ROUTES_DATA[bus.routeId]) return;
      const stopsArray = ROUTES_DATA[bus.routeId];
      const idxA = stopsArray.indexOf(boardingPoint);
      const idxB = stopsArray.indexOf(destination);

      if (idxA !== -1 && idxB !== -1) {
        // Check direction
        const requiredDir = idxA < idxB ? 1 : -1;
        if (bus.dir === requiredDir) {
          const dist = getDistanceFromLatLonInKm(bus.lat, bus.lng, startCoords[0], startCoords[1]);
          // Approximate ETA (dist / speed factor)
          const etaMins = Math.max(1, Math.round(dist / (bus.speed * 20))); 
          validBuses.push({ ...bus, dist, etaMins });
        }
      }
    });

    // Sort by ETA ascending
    validBuses.sort((a, b) => a.etaMins - b.etaMins);
    return validBuses;
  }, [buses, routeConfirmed, boardingPoint, destination]);

  return (
    <div className={`app-root ${theme}`}>
      <style>{`
        :root {
            --primary: #000000;
            --primary-hover: #333333;
            --surface: #ffffff;
            --background: #f1f5f9;
            --text-dark: #0f172a;
            --text-muted: #64748b;
            --success: #10b981;
            --danger: #ef4444;
            --border: #e2e8f0;
            --card-shadow: 0 4px 20px rgba(0,0,0,0.08);
            --sheet-shadow: 0 -10px 40px rgba(0,0,0,0.1);
        }
        [data-theme="dark"] {
            --primary: #ffffff;
            --primary-hover: #e2e8f0;
            --surface: #1e293b;
            --background: #0f172a;
            --text-dark: #f8fafc;
            --text-muted: #94a3b8;
            --border: #334155;
            --card-shadow: 0 4px 20px rgba(0,0,0,0.4);
            --sheet-shadow: 0 -10px 40px rgba(0,0,0,0.4);
        }
        * { box-sizing: border-box; }
        .app-root { background-color: var(--background); width: 100vw; height: 100dvh; overflow: hidden; font-family: 'Inter', system-ui, sans-serif; position: relative; color: var(--text-dark); transition: background-color 0.3s ease, color 0.3s ease; }
        
        .sidebar { position: fixed; top: 0; left: -100%; bottom: 0; width: 300px; max-width: 80%; background-color: var(--surface); z-index: 2000; transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; box-shadow: 4px 0 25px rgba(0,0,0,0.15); }
        .sidebar.open { left: 0; }
        .sidebar-header { padding: 2rem 1.5rem 1.5rem; border-bottom: 1px solid var(--border); font-size: 1.5rem; font-weight: 800; color: var(--text-dark); letter-spacing: -0.5px;}
        .side-item { padding: 1rem 1.5rem; font-size: 1rem; font-weight: 600; color: var(--text-dark); display: flex; align-items: center; gap: 1rem; cursor: pointer; transition: all 0.2s; border-left: 3px solid transparent; margin: 0.25rem 0; }
        .side-item:hover, .side-item.active { background-color: var(--background); color: var(--primary); }
        .side-item i { font-size: 1.25rem; width: 24px; text-align: center; color: var(--text-muted); transition: color 0.2s;}
        .side-item:hover i, .side-item.active i { color: var(--primary); }
        .side-footer { margin-top: auto; padding: 1.25rem 1.5rem; border-top: 1px solid var(--border); font-weight: 600; color: var(--danger); display: flex; align-items: center; gap: 1rem; cursor: pointer; transition: background 0.2s; }
        .menu-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); z-index: 1500; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; backdrop-filter: blur(2px); }
        .menu-overlay.active { opacity: 1; pointer-events: auto; }
        
        .screen { display: none; height: calc(100dvh - 64px); overflow-y: auto; padding-bottom: 2rem; }
        .screen.active { display: block; }
        .screen-map.active { display: block; height: 100dvh; padding-bottom: 0; overflow: hidden; }
        
        .container { max-width: 1000px; margin: 0 auto; padding: 2rem 1.5rem; }
        .welcome-text { font-size: 2rem; color: var(--text-dark); margin-bottom: 2.5rem; font-weight: 400; letter-spacing: -0.5px;}
        .welcome-text strong { font-weight: 800; color: var(--text-dark); }
        
        /* Dashboard Home */
        .grid-menu { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
        .menu-card { background: var(--surface); padding: 1.5rem; border-radius: 1.25rem; display: flex; align-items: center; gap: 1.25rem; cursor: pointer; box-shadow: var(--card-shadow); border: 1px solid var(--border); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .menu-icon { font-size: 1.5rem; width: 56px; height: 56px; border-radius: 50%; background: var(--background); display: flex; align-items: center; justify-content: center; color: var(--text-dark); }
        .menu-title { font-weight: 700; font-size: 1.125rem; color: var(--text-dark); margin-bottom: 0.25rem;}
        .menu-desc { font-size: 0.875rem; color: var(--text-muted); }
        
        /* Map UI */
        .map-wrapper { position: relative; width: 100%; height: 100dvh; }
        .map-embed { width: 100%; height: 100%; z-index: 1; }
        
        .fab-menu { position: absolute; top: 1.5rem; left: 1.5rem; z-index: 1000; width: 48px; height: 48px; border-radius: 50%; background: var(--surface); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; color: var(--text-dark); box-shadow: 0 4px 15px rgba(0,0,0,0.15); cursor: pointer; transition: transform 0.2s; border: none; outline: none; }
        .fab-menu:hover { transform: scale(1.05); }

        /* True Bottom Sheet */
        .bottom-sheet { 
          position: absolute; 
          bottom: 0; 
          left: 50%; 
          transform: translateX(-50%); 
          width: 100%; 
          max-width: 500px; 
          background: var(--surface); 
          border-radius: 24px 24px 0 0; 
          padding: 24px 20px; 
          z-index: 1000; 
          box-shadow: var(--sheet-shadow); 
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .bottom-sheet.half { transform: translateX(-50%) translateY(0); }
        .bottom-sheet.full { transform: translateX(-50%) translateY(-20vh); }
        .bottom-sheet.hidden { transform: translateX(-50%) translateY(100%); }

        .sheet-handle { width: 40px; height: 4px; background: var(--border); border-radius: 2px; margin: 0 auto 20px auto; cursor: grab; }
        .sheet-title { font-size: 1.25rem; font-weight: 800; margin-bottom: 1rem; color: var(--text-dark); }
        
        .location-input-container { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 16px; position: relative; }
        .location-line { position: absolute; left: 7px; top: 20px; bottom: 20px; width: 2px; background: var(--border); }
        .location-dots { display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding-top: 14px; padding-bottom: 14px; z-index: 2; height: 110px; }
        .dot-start { width: 14px; height: 14px; background: var(--success); border-radius: 50%; border: 3px solid var(--surface); box-shadow: 0 0 0 1px var(--border); }
        .dot-end { width: 14px; height: 14px; background: var(--danger); border-radius: 0; border: 3px solid var(--surface); box-shadow: 0 0 0 1px var(--border); }
        
        .inputs-column { flex: 1; display: flex; flex-direction: column; gap: 12px; }
        .sheet-input { 
          width: 100%; 
          background: var(--background); 
          border: 1px solid var(--border); 
          padding: 14px 16px; 
          border-radius: 12px; 
          font-size: 16px; 
          font-weight: 600; 
          color: var(--text-dark); 
          outline: none; 
          appearance: none;
        }
        .sheet-input:focus { border-color: var(--text-dark); }
        
        .black-btn { 
          width: 100%; 
          background: var(--text-dark); 
          color: var(--surface); 
          border: none; 
          padding: 16px; 
          border-radius: 12px; 
          font-size: 16px; 
          font-weight: 700; 
          cursor: pointer; 
          transition: transform 0.2s; 
          margin-top: 10px;
        }
        .black-btn:hover { transform: scale(0.98); }

        /* Bus List UI */
        .bus-list { max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 5px; margin-bottom: 15px; }
        .bus-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--background); border: 2px solid transparent; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
        .bus-item:hover { border-color: var(--border); }
        .bus-item.selected { border-color: var(--text-dark); background: var(--surface); box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        
        .bus-info-left { display: flex; align-items: center; gap: 12px; }
        .bus-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 18px; color: var(--text-dark); }
        .bus-route-id { font-weight: 800; font-size: 16px; color: var(--text-dark); }
        .bus-status { font-size: 12px; color: var(--text-muted); font-weight: 600; }
        
        .bus-info-right { text-align: right; }
        .bus-eta { font-weight: 800; font-size: 18px; color: var(--success); }
        .bus-dist { font-size: 12px; color: var(--text-muted); }
      `}</style>

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">RTC LIVE</div>
        <div className="side-item" onClick={handleGoHome}>
          <i className="fas fa-home"></i> Home
        </div>
        <div className="side-footer" onClick={onLogout}>
          <i className="fas fa-sign-out-alt"></i> Sign Out
        </div>
      </div>
      <div className={`menu-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

      {/* Home Screen */}
      <div className={`screen ${activeScreen === 'home' ? 'active' : ''}`}>
        <div className="top-nav" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
          <button className="nav-btn" onClick={() => setIsSidebarOpen(true)}><i className="fas fa-bars"></i></button>
          <div className="profile-btn" style={{ background: 'var(--text-dark)' }}>{userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}</div>
        </div>
        <div className="container" style={{ animation: 'slideUp 0.4s forwards' }}>
          <div className="welcome-text">
            Good morning, <strong>{userEmail?.split('@')[0] || "Traveler"}</strong>
          </div>
          <div className="grid-menu">
            <div className="menu-card" onClick={() => navigateTo('map')}>
              <div className="menu-icon"><i className="fas fa-search"></i></div>
              <div>
                <div className="menu-title">Where to?</div>
                <div className="menu-desc">Find routes & ETAs</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Screen */}
      <div className={`screen screen-map ${activeScreen === 'map' ? 'active' : ''}`}>
        <div className="map-wrapper">
          <button className="fab-menu" onClick={handleGoHome}>
            <i className="fas fa-arrow-left"></i>
          </button>

          <div className="map-embed">
            {activeScreen === 'map' && (
              <MapComponent 
                boardingPoint={boardingPoint} 
                destination={destination} 
                routeConfirmed={routeConfirmed} 
                selectedBusId={selectedBusId}
                buses={buses}
              />
            )}
          </div>

          {activeScreen === 'map' && <AIChatWidget />}
          
          {/* Bottom Sheet */}
          <div className={`bottom-sheet ${sheetState}`} onClick={() => { if(!routeConfirmed) setSheetState('full') }}>
            <div className="sheet-handle" onClick={(e) => { e.stopPropagation(); setSheetState(sheetState === 'half' ? 'full' : 'half') }}></div>
            
            {!routeConfirmed ? (
              <>
                <div className="sheet-title">Plan your ride</div>
                <div className="location-input-container">
                  <div className="location-line"></div>
                  <div className="location-dots">
                    <div className="dot-start"></div>
                    <div className="dot-end"></div>
                  </div>
                  <div className="inputs-column">
                    <select className="sheet-input" value={boardingPoint} onChange={(e) => setBoardingPoint(e.target.value)}>
                      <option value="" disabled>Current Location</option>
                      {stopNames.map(stop => (
                        <option key={stop} value={stop}>{stop}</option>
                      ))}
                    </select>
                    <select className="sheet-input" value={destination} onChange={(e) => setDestination(e.target.value)}>
                      <option value="" disabled>Where to?</option>
                      {stopNames.map(stop => (
                        <option key={stop} value={stop}>{stop}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {boardingPoint && destination && (
                  <button className="black-btn" onClick={(e) => { e.stopPropagation(); handleStartTracking(); }}>
                    Find Buses
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="sheet-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Incoming Buses</span>
                  <button style={{ background: 'var(--background)', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setRouteConfirmed(false); setSelectedBusId(null); }}>
                    <i className="fas fa-times" style={{ color: 'var(--text-muted)' }}></i>
                  </button>
                </div>
                
                {incomingBuses.length > 0 ? (
                  <div className="bus-list">
                    {incomingBuses.map(bus => (
                      <div 
                        key={bus.id} 
                        className={`bus-item ${selectedBusId === bus.id ? 'selected' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setSelectedBusId(bus.id); }}
                      >
                        <div className="bus-info-left">
                          <div className="bus-icon"><i className="fas fa-bus-alt"></i></div>
                          <div>
                            <div className="bus-route-id">Route {bus.routeId}</div>
                            <div className="bus-status">Live Location</div>
                          </div>
                        </div>
                        <div className="bus-info-right">
                          <div className="bus-eta">{bus.etaMins} min</div>
                          <div className="bus-dist">{bus.dist.toFixed(1)} km away</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600' }}>
                    No active buses found on this route right now.
                  </div>
                )}
                
                {selectedBusId && (
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <i className="fas fa-shield-alt"></i> Trip monitored securely
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
}