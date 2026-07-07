import { useState, useEffect } from "react";
import MapComponent from "./MapComponent";
import AIChatWidget from "./AIChatWidget";
import { MyRoutes, RideHistory, RouteSchedules, MyPasses, Settings } from "./DashboardScreens";

export default function UserDashboard({ userEmail, onLogout }) {
  const [activeScreen, setActiveScreen] = useState('home'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [theme, setTheme] = useState('light');

  const [boardingPoint, setBoardingPoint] = useState('');
  const [destination, setDestination] = useState('');
  const [busRoute, setBusRoute] = useState('');
  const [eta, setEta] = useState(null);
  const [isCalculatingAI, setIsCalculatingAI] = useState(false);

  const showSuggestions = boardingPoint !== '' && destination !== '';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

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

  const navigateTo = (screen) => {
    setActiveScreen(screen);
    setIsSidebarOpen(false);
  };

  return (
    <div className={`app-root ${theme}`}>
      <style>{`
        :root {
            /* Light Theme */
            --primary: #4f46e5;
            --primary-hover: #4338ca;
            --surface: #ffffff;
            --background: #f8fafc;
            --text-dark: #0f172a;
            --text-muted: #64748b;
            --success: #10b981;
            --danger: #ef4444;
            --border: #e2e8f0;
            --card-shadow: 0 10px 25px rgba(0,0,0,0.05);
            --glass-bg: rgba(255, 255, 255, 0.7);
        }

        [data-theme="dark"] {
            --primary: #6366f1;
            --primary-hover: #818cf8;
            --surface: #1e293b;
            --background: #0f172a;
            --text-dark: #f8fafc;
            --text-muted: #94a3b8;
            --border: #334155;
            --card-shadow: 0 10px 25px rgba(0,0,0,0.3);
            --glass-bg: rgba(30, 41, 59, 0.7);
        }

        * { box-sizing: border-box; }

        /* Base App Reset */
        .app-root {
            background-color: var(--background); 
            width: 100vw;
            height: 100dvh;
            overflow: hidden;
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            position: relative;
            color: var(--text-dark);
            transition: background-color 0.3s ease, color 0.3s ease;
        }

        /* Helpers */
        .text-danger { color: var(--danger); }
        .text-success { color: var(--success); }
        .text-muted { color: var(--text-muted); }
        .bg-indigo { background-color: #6366f1; }
        .bg-emerald { background-color: #10b981; }
        .bg-blue { background-color: #3b82f6; }
        .mt-2 { margin-top: 0.5rem; }
        .mt-4 { margin-top: 1rem; }
        .mt-6 { margin-top: 1.5rem; }
        .w-full { width: 100%; }
        .uppercase { text-transform: uppercase; }
        .font-bold { font-weight: 700; }
        .font-mono { font-family: monospace; font-size: 1.1rem; letter-spacing: 1px;}
        .text-xs { font-size: 0.75rem; }
        .text-sm { font-size: 0.875rem; }
        .right { text-align: right; }
        .ml-2 { margin-left: 0.5rem; }

        /* Animations */
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        /* Global Header */
        .top-nav {
            background: var(--glass-bg);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            padding: 1rem 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            position: sticky;
            top: 0;
            z-index: 50;
            border-bottom: 1px solid var(--border);
        }
        .nav-btn {
            background: none; border: none; font-size: 1.25rem; color: var(--text-dark);
            cursor: pointer; padding: 0.5rem; border-radius: 50%; transition: background 0.2s;
            display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;
        }
        .nav-btn:hover { background: var(--surface); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .nav-title { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.5px; margin: 0; color: var(--text-dark); }
        .profile-btn { width: 35px; height: 35px; border-radius: 50%; background: var(--primary); color: white; display:flex; align-items:center; justify-content:center; cursor: pointer; font-weight:bold; }

        /* Sidebar Overlay */
        .sidebar {
            position: fixed; top: 0; left: -100%; bottom: 0; width: 300px; max-width: 80%;
            background-color: var(--surface); z-index: 2000;
            transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex; flex-direction: column; box-shadow: 4px 0 25px rgba(0,0,0,0.15);
        }
        .sidebar.open { left: 0; }
        
        .sidebar-header { padding: 2rem 1.5rem 1.5rem; border-bottom: 1px solid var(--border); font-size: 1.5rem; font-weight: 800; color: var(--primary); letter-spacing: -0.5px;}
        .side-item {
            padding: 1rem 1.5rem; font-size: 1rem; font-weight: 600; color: var(--text-dark);
            display: flex; align-items: center; gap: 1rem; cursor: pointer; transition: all 0.2s;
            border-left: 3px solid transparent; margin: 0.25rem 0;
        }
        .side-item:hover, .side-item.active { background-color: var(--background); color: var(--primary); border-left-color: var(--primary);}
        .side-item i { font-size: 1.25rem; width: 24px; text-align: center; color: var(--text-muted); transition: color 0.2s;}
        .side-item:hover i, .side-item.active i { color: var(--primary); }

        .side-footer {
            margin-top: auto; padding: 1.25rem 1.5rem; border-top: 1px solid var(--border);
            font-weight: 600; color: var(--danger); display: flex; align-items: center; gap: 1rem; cursor: pointer; transition: background 0.2s;
        }
        .side-footer:hover { background-color: rgba(239, 68, 68, 0.1); }

        .menu-overlay {
            position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); z-index: 1500;
            opacity: 0; pointer-events: none; transition: opacity 0.3s ease; backdrop-filter: blur(2px);
        }
        .menu-overlay.active { opacity: 1; pointer-events: auto; }

        /* Screens */
        .screen { display: none; height: calc(100dvh - 64px); overflow-y: auto; padding-bottom: 2rem; }
        .screen.active { display: block; }
        .screen-map.active { display: block; height: 100dvh; padding-bottom: 0;}

        /* Container & Layout */
        .container { max-width: 1000px; margin: 0 auto; padding: 2rem 1.5rem; }
        .screen-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
        .screen-header i { cursor: pointer; color: var(--text-muted); font-size: 1.25rem; transition: color 0.2s; width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:50%; background: var(--surface); box-shadow: 0 2px 5px rgba(0,0,0,0.05);}
        .screen-header i:hover { color: var(--primary); transform: scale(1.05); }
        .screen-header h2 { margin: 0; font-size: 1.75rem; font-weight: 800; letter-spacing: -0.5px; }

        /* Dashboard specific */
        .welcome-text { font-size: 2rem; color: var(--text-dark); margin-bottom: 2.5rem; font-weight: 400; letter-spacing: -0.5px;}
        .welcome-text strong { font-weight: 800; color: var(--primary); }
        
        .grid-menu { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
        .menu-card {
            background: var(--surface); padding: 1.5rem; border-radius: 1.25rem;
            display: flex; align-items: center; gap: 1.25rem; cursor: pointer;
            box-shadow: var(--card-shadow); border: 1px solid var(--border);
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative; overflow: hidden;
        }
        .menu-card::after { content: ''; position:absolute; inset: 0; border-radius: 1.25rem; border: 2px solid transparent; transition: border-color 0.3s; pointer-events: none;}
        .menu-card:hover { transform: translateY(-5px); box-shadow: 0 15px 30px rgba(0,0,0,0.1); }
        .menu-card:hover::after { border-color: var(--primary); }
        .menu-icon { font-size: 1.5rem; width: 56px; height: 56px; border-radius: 1rem; background: rgba(79, 70, 229, 0.1); display: flex; align-items: center; justify-content: center; color: var(--primary); transition: transform 0.3s;}
        .menu-card:hover .menu-icon { transform: scale(1.1) rotate(5deg); }
        .menu-title { font-weight: 700; font-size: 1.125rem; color: var(--text-dark); margin-bottom: 0.25rem;}
        .menu-desc { font-size: 0.875rem; color: var(--text-muted); }

        /* Premium Components */
        .premium-card { background: var(--surface); border-radius: 1.25rem; padding: 1.5rem; margin-bottom: 1rem; box-shadow: var(--card-shadow); border: 1px solid var(--border); display: flex; align-items: center; gap: 1rem; transition: transform 0.2s;}
        .premium-card:hover { transform: translateY(-2px); }
        
        .card-icon { width: 48px; height: 48px; border-radius: 50%; background: var(--background); display: flex; align-items:center; justify-content:center; font-size: 1.25rem; flex-shrink: 0;}
        .card-content { flex: 1; }
        .card-content h3 { margin: 0 0 0.25rem 0; font-size: 1.125rem; font-weight: 700;}
        .card-content p { margin: 0; color: var(--text-muted); font-size: 0.9rem;}
        
        .icon-btn { background: none; border: none; font-size: 1.125rem; cursor: pointer; padding: 0.5rem; border-radius: 50%; transition: background 0.2s; color: var(--text-muted);}
        .icon-btn:hover { background: var(--background); color: var(--danger); }
        
        .badge { background: rgba(79, 70, 229, 0.1); color: var(--primary); padding: 0.25rem 0.75rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 700; display: inline-block; margin-top: 0.5rem;}
        .badge-success { background: rgba(16, 185, 129, 0.1); color: var(--success); padding: 0.25rem 0.75rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 700;}
        
        .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--success); margin-right: 4px; }
        .status-badge { display: inline-flex; align-items: center; font-size: 0.75rem; font-weight: 600; margin-top: 0.5rem; background: var(--background); padding: 0.25rem 0.5rem; border-radius: 0.5rem;}

        /* Track Form */
        .track-card { background: var(--surface); max-width: 500px; margin: 2rem auto; border-radius: 1.5rem; padding: 2rem; box-shadow: var(--card-shadow); border: 1px solid var(--border); }
        .input-group { margin-bottom: 1.25rem; position: relative; }
        .pill-input {
            width: 100%; padding: 1rem 1.25rem; border: 2px solid var(--border); border-radius: 1rem;
            font-size: 1rem; background-color: var(--background); color: var(--text-dark);
            outline: none; transition: all 0.2s; box-sizing: border-box; font-family: inherit; font-weight: 500;
        }
        .pill-input:focus { border-color: var(--primary); background-color: var(--surface); box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
        select.pill-input { appearance: none; cursor: pointer; }
        .select-arrow { position: absolute; right: 1.25rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }

        .suggestion-box { background: rgba(79, 70, 229, 0.05); border-radius: 1rem; padding: 1.25rem; margin-bottom: 1.25rem; border: 1px dashed rgba(79, 70, 229, 0.3);}
        .suggestion-box h4 { margin: 0 0 0.5rem 0; font-size: 0.875rem; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.5px;}
        .suggestion-box ul { margin: 0; padding-left: 1.25rem; font-size: 0.875rem; font-weight: 600; line-height: 1.5;}

        .btn-primary {
            width: 100%; background-color: var(--primary); color: white; font-weight: 700; font-size: 1rem;
            border: none; border-radius: 1rem; padding: 1rem; cursor: pointer; transition: all 0.2s; margin-top: 0.5rem;
            display: flex; justify-content: center; align-items: center; gap: 0.5rem;
        }
        .btn-primary:hover { background-color: var(--primary-hover); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); }

        /* Full Screen Map & Floating UI */
        .map-wrapper { position: relative; width: 100%; height: 100dvh; }
        .map-embed { width: 100%; height: 100%; z-index: 1; }

        .floating-back-btn {
            position: absolute; top: 1.5rem; left: 1.5rem; z-index: 1000;
            width: 48px; height: 48px; border-radius: 50%; background: var(--surface);
            display: flex; align-items: center; justify-content: center; font-size: 1.25rem; color: var(--text-dark);
            box-shadow: 0 4px 15px rgba(0,0,0,0.15); cursor: pointer; transition: transform 0.2s;
        }
        .floating-back-btn:hover { transform: scale(1.1); }

        .eta-sheet {
            position: absolute; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
            width: calc(100% - 3rem); max-width: 450px;
            background-color: var(--surface); color: var(--text-dark); border-radius: 1.5rem; padding: 1.5rem;
            z-index: 1000; cursor: pointer; box-shadow: 0 20px 40px rgba(0,0,0,0.2); border: 1px solid var(--border);
            overflow: hidden; max-height: 85px; transition: max-height 0.5s cubic-bezier(0.2, 1, 0.3, 1), background-color 0.3s;
        }
        .eta-sheet.expanded { max-height: 500px; cursor: default; }

        .sheet-header { display: flex; align-items: center; gap: 1.25rem; }
        .sheet-icon-wrapper { width: 48px; height: 48px; border-radius: 50%; background: var(--success); color: white; display:flex; align-items:center; justify-content:center; font-size: 1.5rem;}
        .sheet-title { font-size: 1.25rem; font-weight: 800; line-height: 1.2; }
        .sheet-subtitle { font-size: 0.875rem; font-weight: 500; color: var(--text-muted); }

        .sheet-body {
            margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem;
            opacity: 0; transition: opacity 0.3s ease; visibility: hidden;
        }
        .eta-sheet.expanded .sheet-body { opacity: 1; visibility: visible; transition-delay: 0.2s; }

        .data-card { background: var(--background); border-radius: 1rem; padding: 1.25rem; border: 1px solid var(--border);}
        .data-title { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.75rem; color: var(--text-muted); }
        .data-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; font-size: 0.875rem; }
        .data-row:last-child { margin-bottom: 0; }
        .data-row strong { font-size: 0.9375rem; font-weight: 700; color: var(--text-dark);}

        /* Schedules */
        .schedule-card { flex-direction: column; align-items: stretch; gap: 1rem; }
        .schedule-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 1rem;}
        .route-badge { font-size: 1.25rem; font-weight: 800; color: var(--primary); }
        .frequency { font-size: 0.875rem; font-weight: 600; color: var(--text-muted); display:flex; align-items:center; gap:0.5rem;}
        .schedule-times { display: flex; justify-content: space-between; }
        
        /* Digital Pass */
        .pass-container { perspective: 1000px; margin-top: 1rem;}
        .digital-pass { background: linear-gradient(135deg, var(--primary), var(--primary-hover)); border-radius: 1.5rem; color: white; padding: 1.5rem; box-shadow: 0 15px 30px rgba(79, 70, 229, 0.4); transform-style: preserve-3d; transition: transform 0.5s; position: relative; overflow: hidden;}
        .digital-pass::before { content:''; position:absolute; top:-50%; left:-50%; width:200%; height:200%; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%); pointer-events: none;}
        .pass-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.3); padding-bottom: 1rem; margin-bottom: 1rem;}
        .pass-header h3 { margin: 0; font-size: 1.125rem; font-weight: 800; letter-spacing: 0.5px;}
        .pass-body { display: flex; gap: 1.5rem; align-items: center; margin-bottom: 1rem;}
        .qr-placeholder { width: 100px; height: 100px; background: white; border-radius: 0.75rem; display:flex; align-items:center; justify-content:center; color: #000; font-size: 4rem;}
        .pass-details h4 { margin: 0; font-size: 1.25rem; font-weight: 700;}
        .pass-details .text-muted { color: rgba(255,255,255,0.7); margin: 0; }
        .pass-footer { background: rgba(0,0,0,0.15); padding: 0.75rem 1rem; border-radius: 0.75rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; font-weight: 600;}

        /* Settings */
        .settings-section { margin-bottom: 2rem; }
        .profile-card { background: var(--surface); border-radius: 1.25rem; padding: 1.5rem; display: flex; align-items: center; gap: 1.5rem; box-shadow: var(--card-shadow); border: 1px solid var(--border);}
        .avatar { width: 64px; height: 64px; border-radius: 50%; background: rgba(79, 70, 229, 0.1); color: var(--primary); font-size: 2rem; display:flex; align-items:center; justify-content:center; }
        .profile-info h3 { margin: 0 0 0.25rem 0; font-size: 1.25rem; font-weight: 800;}
        .profile-info p { margin: 0; color: var(--text-muted); font-size: 0.875rem;}
        
        .settings-heading { font-size: 0.875rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin: 0 0 1rem 1rem; font-weight: 700;}
        .settings-list { background: var(--surface); border-radius: 1.25rem; padding: 0.5rem; box-shadow: var(--card-shadow); border: 1px solid var(--border);}
        .setting-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--border); transition: background 0.2s;}
        .setting-item:last-child { border-bottom: none; }
        .setting-item.clickable:hover { background: var(--background); cursor: pointer; border-radius: 0.75rem;}
        .setting-label { display: flex; align-items: center; gap: 1rem; font-weight: 600; font-size: 1rem;}
        .icon-wrapper { width: 36px; height: 36px; border-radius: 0.75rem; color: white; display:flex; align-items:center; justify-content:center; font-size: 1rem;}
        
        /* Toggle Switch */
        .toggle-switch { position: relative; display: inline-block; width: 50px; height: 28px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);}
        input:checked + .slider { background-color: var(--primary); }
        input:checked + .slider:before { transform: translateX(22px); }
      `}</style>

      {/* --- Global Sidebar Navigation --- */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          RTC LIVE
        </div>
        <div className={`side-item ${activeScreen === 'home' ? 'active' : ''}`} onClick={() => navigateTo('home')}>
          <i className="fas fa-home"></i> Dashboard
        </div>
        <div className={`side-item ${activeScreen === 'track' ? 'active' : ''}`} onClick={() => navigateTo('track')}>
          <i className="fas fa-location-arrow"></i> Track Bus
        </div>
        <div className={`side-item ${activeScreen === 'myroutes' ? 'active' : ''}`} onClick={() => navigateTo('myroutes')}>
          <i className="fas fa-heart"></i> My Routes
        </div>
        <div className={`side-item ${activeScreen === 'schedules' ? 'active' : ''}`} onClick={() => navigateTo('schedules')}>
          <i className="fas fa-calendar-alt"></i> Schedules
        </div>
        <div className={`side-item ${activeScreen === 'passes' ? 'active' : ''}`} onClick={() => navigateTo('passes')}>
          <i className="fas fa-ticket-alt"></i> My Passes
        </div>
        <div className={`side-item ${activeScreen === 'history' ? 'active' : ''}`} onClick={() => navigateTo('history')}>
          <i className="fas fa-history"></i> Ride History
        </div>
        <div className={`side-item ${activeScreen === 'settings' ? 'active' : ''}`} onClick={() => navigateTo('settings')}>
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
          <div className="profile-btn" onClick={() => navigateTo('settings')}>
            {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      )}

      {/* --- SCREEN: Home Dashboard --- */}
      <div className={`screen ${activeScreen === 'home' ? 'active' : ''}`}>
        <div className="container slide-up">
          <div className="welcome-text">
            Good morning, <strong>{userEmail?.split('@')[0] || "Traveler"}</strong><br/>
            Where are we going today?
          </div>

          <div className="grid-menu">
            <div className="menu-card" onClick={() => navigateTo('track')}>
              <div className="menu-icon"><i className="fas fa-location-arrow"></i></div>
              <div>
                <div className="menu-title">Track a Bus</div>
                <div className="menu-desc">Live GPS updates</div>
              </div>
            </div>
            <div className="menu-card" onClick={() => navigateTo('schedules')}>
              <div className="menu-icon"><i className="fas fa-route"></i></div>
              <div>
                <div className="menu-title">Route Schedules</div>
                <div className="menu-desc">Timetables & stops</div>
              </div>
            </div>
            <div className="menu-card" onClick={() => navigateTo('passes')}>
              <div className="menu-icon"><i className="fas fa-ticket-alt"></i></div>
              <div>
                <div className="menu-title">My Passes</div>
                <div className="menu-desc">Manage digital tickets</div>
              </div>
            </div>
          </div>

          <h3 className="mt-6 font-bold uppercase text-xs text-muted" style={{letterSpacing: '1px', marginLeft: '0.5rem'}}>Recent Activity</h3>
          <div className="premium-card history-card mt-2" onClick={() => navigateTo('history')} style={{cursor: 'pointer'}}>
            <div className="card-icon"><i className="fas fa-history text-muted"></i></div>
            <div className="card-content">
              <h3>Route 38Y</h3>
              <p className="text-sm">Today, 09:30 AM</p>
            </div>
            <i className="fas fa-chevron-right text-muted"></i>
          </div>
        </div>
      </div>

      {/* --- SCREEN: Track Form --- */}
      <div className={`screen ${activeScreen === 'track' ? 'active' : ''}`}>
        <div className="container slide-up">
          <div className="screen-header">
            <i className="fas fa-arrow-left" onClick={handleGoHome}></i>
            <h2>Plan Your Journey</h2>
          </div>
          <div className="track-card">
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
              Start Tracking <i className="fas fa-arrow-right ml-2"></i>
            </button>
          </div>
        </div>
      </div>

      {/* --- SCREEN: Full Screen Live Map --- */}
      <div className={`screen screen-map ${activeScreen === 'map' ? 'active' : ''}`}>
        <div className="map-wrapper">
          <div className="floating-back-btn" onClick={() => setActiveScreen('track')}>
            <i className="fas fa-arrow-left"></i>
          </div>

          <div className="map-embed">
            {activeScreen === 'map' && <MapComponent />}
          </div>

          {activeScreen === 'map' && <AIChatWidget />}
          
          <div className={`eta-sheet ${isSheetExpanded ? 'expanded' : ''}`} onClick={() => !isSheetExpanded && setIsSheetExpanded(true)}>
            <div className="sheet-header" onClick={(e) => { if(isSheetExpanded) { e.stopPropagation(); setIsSheetExpanded(false); } }}>
              <div className="sheet-icon-wrapper">
                <i className={isCalculatingAI ? "fas fa-spinner fa-spin" : "fas fa-bus"}></i>
              </div>
              <div>
                <div className="sheet-title">
                  {isCalculatingAI ? "Predicting ETA..." : `Arriving in ${eta} min`}
                </div>
                <div className="sheet-subtitle">
                  {isCalculatingAI ? "Running Random Forest Model" : `Drop-off at ${destination}`}
                </div>
              </div>
              {isSheetExpanded && <i className="fas fa-chevron-down" style={{marginLeft: 'auto', opacity: 0.5, fontSize: '1.25rem'}}></i>}
            </div>

            <div className="sheet-body">
              <div className="data-card">
                <div className="data-title">Journey Details</div>
                <div className="data-row"><span>Boarding:</span> <strong>{boardingPoint}</strong></div>
                <div className="data-row"><span>Destination:</span> <strong>{destination}</strong></div>
              </div>

              <div className="data-card">
                <div className="data-title">AI Telemetry</div>
                <div className="data-row"><span>Live Traffic:</span> <strong>Moderate</strong></div>
                <div className="data-row"><span>Model Confidence:</span> <strong className="text-success">94.2%</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- NEW SCREENS --- */}
      <div className={`screen ${['myroutes', 'history', 'schedules', 'passes', 'settings'].includes(activeScreen) ? 'active' : ''}`}>
        {activeScreen === 'myroutes' && <MyRoutes onBack={handleGoHome} />}
        {activeScreen === 'history' && <RideHistory onBack={handleGoHome} />}
        {activeScreen === 'schedules' && <RouteSchedules onBack={handleGoHome} />}
        {activeScreen === 'passes' && <MyPasses onBack={handleGoHome} />}
        {activeScreen === 'settings' && <Settings onBack={handleGoHome} userEmail={userEmail} theme={theme} toggleTheme={toggleTheme} />}
      </div>
      
    </div>
  );
}