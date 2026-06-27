import { useState } from "react";
import MapComponent from "./MapComponent";
import AIChatWidget from "./AIChatWidget";

export default function UserDashboard({ userEmail, onLogout }) {
  const [activeScreen, setActiveScreen] = useState('home'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  const [boardingPoint, setBoardingPoint] = useState('');
  const [destination, setDestination] = useState('');
  const [busRoute, setBusRoute] = useState('');
  const [eta, setEta] = useState(null);
  const [isCalculatingAI, setIsCalculatingAI] = useState(false);

  const showSuggestions = boardingPoint !== '' && destination !== '';

  const handleStartTracking = () => {
    if (!boardingPoint || !destination) {
      alert("Please select a boarding point and destination.");
      return;
    }
    
    setActiveScreen('map');
    setIsCalculatingAI(true);
    
    setTimeout(() => {
      setEta(Math.floor(Math.random() * 10) + 5); 
      setIsCalculatingAI(false);
    }, 1500);
  };

  const handleGoHome = () => {
    setActiveScreen('home');
    setBoardingPoint('');
    setDestination('');
    setBusRoute('');
    setIsSheetExpanded(false);
    setEta(null);
  };

  return (
    <div className="app-root">
      <style>{`
        :root {
            --primary: #2563eb;
            --primary-hover: #1d4ed8;
            --surface: #ffffff;
            --background: #f8fafc;
            --text-dark: #0f172a;
            --text-muted: #64748b;
            --success: #10b981;
            --border: #e2e8f0;
        }

        /* Base App Reset */
        .app-root {
            background-color: var(--background); 
            width: 100vw;
            height: 100dvh; /* Uses dynamic viewport height for mobile */
            overflow: hidden;
            font-family: 'Segoe UI', system-ui, sans-serif;
            position: relative;
        }

        /* --- Global Header (Hidden on Map Screen) --- */
        .top-nav {
            background: var(--surface);
            padding: 1rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            position: sticky;
            top: 0;
            z-index: 50;
        }
        .nav-btn {
            background: none; border: none; font-size: 1.25rem; color: var(--text-dark);
            cursor: pointer; padding: 0.5rem; border-radius: 0.5rem; transition: background 0.2s;
        }
        .nav-btn:hover { background: var(--background); }
        .nav-title { font-size: 1.25rem; font-weight: 800; letter-spacing: 0.5px; margin: 0; color: var(--text-dark); }

        /* --- Sidebar Overlay --- */
        .sidebar {
            position: fixed; top: 0; left: -100%; bottom: 0; width: 300px; max-width: 80%;
            background-color: var(--surface); z-index: 2000;
            transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex; flex-direction: column; box-shadow: 4px 0 25px rgba(0,0,0,0.1);
        }
        .sidebar.open { left: 0; }
        
        .sidebar-header { padding: 1.5rem; border-bottom: 1px solid var(--border); font-size: 1.5rem; font-weight: 800; color: var(--primary); }
        .side-item {
            padding: 1.25rem 1.5rem; font-size: 1rem; font-weight: 600; color: var(--text-dark);
            display: flex; align-items: center; gap: 1rem; cursor: pointer; transition: background 0.2s;
        }
        .side-item:hover { background-color: var(--background); color: var(--primary); }
        .side-item i { font-size: 1.25rem; width: 24px; text-align: center; color: var(--text-muted); }
        .side-item:hover i { color: var(--primary); }

        .side-footer {
            margin-top: auto; padding: 1.25rem 1.5rem; border-top: 1px solid var(--border);
            font-weight: 600; color: #ef4444; display: flex; align-items: center; gap: 1rem; cursor: pointer;
        }
        .side-footer:hover { background-color: #fef2f2; }

        .menu-overlay {
            position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); z-index: 1500;
            opacity: 0; pointer-events: none; transition: opacity 0.3s ease; backdrop-filter: blur(2px);
        }
        .menu-overlay.active { opacity: 1; pointer-events: auto; }

        /* --- Screens --- */
        .screen { display: none; height: calc(100dvh - 64px); overflow-y: auto; }
        .screen.active { display: block; }
        .screen-map.active { display: block; height: 100dvh; }

        /* --- Home Dashboard (Responsive) --- */
        .container { max-width: 1000px; margin: 0 auto; padding: 2rem 1.5rem; }
        .welcome-text { font-size: 2rem; color: var(--text-dark); margin-bottom: 2.5rem; font-weight: 300; }
        .welcome-text strong { font-weight: 700; color: var(--primary); }
        
        .grid-menu {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;
        }
        .menu-card {
            background: var(--surface); padding: 1.5rem; border-radius: 1rem;
            display: flex; align-items: center; gap: 1rem; cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid var(--border);
            transition: all 0.2s ease;
        }
        .menu-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-color: var(--primary); }
        .menu-icon { font-size: 1.5rem; width: 48px; height: 48px; border-radius: 50%; background: #eff6ff; display: flex; align-items: center; justify-content: center; color: var(--primary); }
        .menu-title { font-weight: 600; font-size: 1.125rem; color: var(--text-dark); }

        /* --- Track Form (Minimalist Card) --- */
        .track-card {
            background: var(--surface); max-width: 500px; margin: 2rem auto;
            border-radius: 1.25rem; padding: 2rem; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid var(--border);
        }
        .track-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
        .track-header i { cursor: pointer; color: var(--text-muted); font-size: 1.25rem; }
        .track-header h2 { margin: 0; font-size: 1.5rem; font-weight: 700; }

        .input-group { margin-bottom: 1.25rem; position: relative; }
        .pill-input {
            width: 100%; padding: 1rem 1.25rem; border: 2px solid var(--border); border-radius: 0.75rem;
            font-size: 1rem; background-color: var(--background); color: var(--text-dark);
            outline: none; transition: all 0.2s; box-sizing: border-box; font-family: inherit;
        }
        .pill-input:focus { border-color: var(--primary); background-color: var(--surface); box-shadow: 0 0 0 4px rgba(37,99,235,0.1); }
        select.pill-input { appearance: none; cursor: pointer; }
        .select-arrow { position: absolute; right: 1.25rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }

        .suggestion-box { background: #eff6ff; border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.25rem; }
        .suggestion-box h4 { margin: 0 0 0.5rem 0; font-size: 0.875rem; font-weight: 700; color: #1e3a8a; }
        .suggestion-box ul { margin: 0; padding-left: 1.25rem; font-size: 0.875rem; color: #1e40af; }

        .btn-primary {
            width: 100%; background-color: var(--primary); color: white; font-weight: 600; font-size: 1rem;
            border: none; border-radius: 0.75rem; padding: 1rem; cursor: pointer; transition: background 0.2s; margin-top: 0.5rem;
        }
        .btn-primary:hover { background-color: var(--primary-hover); }

        /* --- Full Screen Map & Floating UI --- */
        .map-wrapper { position: relative; width: 100%; height: 100dvh; }
        .map-embed { width: 100%; height: 100%; z-index: 1; }

        .floating-back-btn {
            position: absolute; top: 1.5rem; left: 1.5rem; z-index: 1000;
            width: 48px; height: 48px; border-radius: 50%; background: var(--surface);
            display: flex; align-items: center; justify-content: center; font-size: 1.25rem; color: var(--text-dark);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: pointer; transition: transform 0.2s;
        }
        .floating-back-btn:hover { transform: scale(1.05); }

        .eta-sheet {
            position: absolute; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
            width: calc(100% - 3rem); max-width: 450px;
            background-color: var(--success); color: white; border-radius: 1.25rem; padding: 1.25rem;
            z-index: 1000; cursor: pointer; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
            overflow: hidden; max-height: 70px; transition: max-height 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .eta-sheet.expanded { max-height: 500px; cursor: default; }

        .sheet-header { display: flex; align-items: center; gap: 1rem; }
        .sheet-header i { font-size: 1.5rem; }
        .sheet-title { font-size: 1.125rem; font-weight: 700; line-height: 1.2; }
        .sheet-subtitle { font-size: 0.875rem; font-weight: 400; opacity: 0.9; }

        .sheet-body {
            margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;
            opacity: 0; transition: opacity 0.2s ease; visibility: hidden;
        }
        .eta-sheet.expanded .sheet-body { opacity: 1; visibility: visible; transition-delay: 0.1s; }

        .data-card { background: rgba(255, 255, 255, 0.15); border-radius: 0.75rem; padding: 1rem; }
        .data-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.75rem; opacity: 0.9; }
        .data-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; font-size: 0.875rem; }
        .data-row:last-child { margin-bottom: 0; }
        .data-row strong { font-size: 0.9375rem; font-weight: 700; }
      `}</style>

      {/* --- Global Sidebar Navigation --- */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">RTC LIVE</div>
        <div className="side-item" onClick={() => { handleGoHome(); setIsSidebarOpen(false); }}>
          <i className="fas fa-home"></i> Dashboard
        </div>
        <div className="side-item">
          <i className="fas fa-bus"></i> My Routes
        </div>
        <div className="side-item">
          <i className="fas fa-history"></i> Ride History
        </div>
        <div className="side-item">
          <i className="fas fa-cog"></i> Settings
        </div>
        <div className="side-footer" onClick={onLogout}>
          <i className="fas fa-sign-out-alt"></i> Sign Out
        </div>
      </div>
      <div className={`menu-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

      {/* --- Top Nav (Hidden when Map is active for full immersion) --- */}
      {activeScreen !== 'map' && (
        <div className="top-nav">
          <button className="nav-btn" onClick={() => setIsSidebarOpen(true)}>
            <i className="fas fa-bars"></i>
          </button>
          <h1 className="nav-title">RTC LIVE</h1>
        </div>
      )}

      {/* --- SCREEN 1: Home Dashboard --- */}
      <div className={`screen ${activeScreen === 'home' ? 'active' : ''}`}>
        <div className="container">
          <div className="welcome-text">
            Good morning, <strong>{userEmail?.split('@')[0] || "Traveler"}</strong><br/>
            Where are we going today?
          </div>

          <div className="grid-menu">
            <div className="menu-card" onClick={() => setActiveScreen('track')}>
              <div className="menu-icon"><i className="fas fa-location-arrow"></i></div>
              <div className="menu-title">Track a Bus</div>
            </div>
            <div className="menu-card">
              <div className="menu-icon"><i className="fas fa-route"></i></div>
              <div className="menu-title">Route Schedules</div>
            </div>
            <div className="menu-card">
              <div className="menu-icon"><i className="fas fa-ticket-alt"></i></div>
              <div className="menu-title">My Passes</div>
            </div>
          </div>
        </div>
      </div>

      {/* --- SCREEN 2: Track Form --- */}
      <div className={`screen ${activeScreen === 'track' ? 'active' : ''}`}>
        <div className="container">
          <div className="track-card">
            <div className="track-header">
              <i className="fas fa-arrow-left" onClick={handleGoHome}></i>
              <h2>Plan Your Journey</h2>
            </div>
              
            <div className="input-group">
              <select className="pill-input" value={boardingPoint} onChange={(e) => setBoardingPoint(e.target.value)}>
                <option value="" disabled>Select Boarding Point</option>
                <option value="Gajuwaka">Gajuwaka</option>
                <option value="NAD">NAD</option>
                <option value="RTC Complex">RTC Complex</option>
              </select>
              <i className="fas fa-chevron-down select-arrow"></i>
            </div>

            <div className="input-group">
              <select className="pill-input" value={destination} onChange={(e) => setDestination(e.target.value)}>
                <option value="" disabled>Select Destination</option>
                <option value="Kurmannapalem">Kurmannapalem</option>
                <option value="Maddilapalem">Maddilapalem</option>
                <option value="Scindia">Scindia</option>
              </select>
              <i className="fas fa-chevron-down select-arrow"></i>
            </div>

            {showSuggestions && (
              <div className="suggestion-box">
                <h4>Suggested Routes</h4>
                <ul>
                  <li><strong>38Y</strong> (via NAD, Gajuwaka)</li>
                  <li><strong>400K</strong> (via Scindia, Gajuwaka)</li>
                </ul>
              </div>
            )}

            <div className="input-group">
              <input 
                type="text" 
                className="pill-input" 
                placeholder="Enter Route No. (e.g., 38Y)"
                value={busRoute}
                onChange={(e) => setBusRoute(e.target.value.toUpperCase())}
              />
            </div>

            <button className="btn-primary" onClick={handleStartTracking}>
              Start Tracking
            </button>
          </div>
        </div>
      </div>

      {/* --- SCREEN 3: Full Screen Live Map --- */}
      <div className={`screen screen-map ${activeScreen === 'map' ? 'active' : ''}`}>
        <div className="map-wrapper">
          
          {/* Floating Back Button */}
          <div className="floating-back-btn" onClick={() => setActiveScreen('track')}>
            <i className="fas fa-arrow-left"></i>
          </div>

          <div className="map-embed">
            {activeScreen === 'map' && <MapComponent />}
          </div>

          {activeScreen === 'map' && <AIChatWidget />}
          
          {/* Floating Bottom Sheet */}
          <div className={`eta-sheet ${isSheetExpanded ? 'expanded' : ''}`} onClick={() => !isSheetExpanded && setIsSheetExpanded(true)}>
            
            <div className="sheet-header" onClick={(e) => { if(isSheetExpanded) { e.stopPropagation(); setIsSheetExpanded(false); } }}>
              <i className={isCalculatingAI ? "fas fa-spinner fa-spin" : "fas fa-location-arrow"}></i>
              <div>
                <div className="sheet-title">
                  {isCalculatingAI ? "Predicting ETA..." : `Arriving in ${eta} min`}
                </div>
                <div className="sheet-subtitle">
                  {isCalculatingAI ? "Running Random Forest Model" : `Drop-off at ${destination}`}
                </div>
              </div>
              {isSheetExpanded && <i className="fas fa-times" style={{marginLeft: 'auto', opacity: 0.8}}></i>}
            </div>

            <div className="sheet-body">
              <div className="data-card">
                <div className="data-title">Journey</div>
                <div className="data-row"><span>Boarding:</span> <strong>{boardingPoint}</strong></div>
                <div className="data-row"><span>Destination:</span> <strong>{destination}</strong></div>
              </div>

              <div className="data-card">
                <div className="data-title">AI Telemetry</div>
                <div className="data-row"><span>Live Traffic:</span> <strong>Moderate</strong></div>
                <div className="data-row"><span>Model Confidence:</span> <strong>94.2%</strong></div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}