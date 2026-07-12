import { useState, useEffect, useMemo } from "react";
import MapComponent from "./MapComponent";
import AIChatWidget from "./AIChatWidget";
import STOPS_DATA from "./data/stops.json";
import STOPS_TE from "./data/stops_te.json";
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
  const [activePanel, setActivePanel] = useState('routes');
  
  const [lang, setLang] = useState('en');
  const t = (en, te) => lang === 'te' ? te : en;
  
  // Map state
  const [boardingPoint, setBoardingPoint] = useState('');
  const [destination, setDestination] = useState('');
  const [routeConfirmed, setRouteConfirmed] = useState(false);
  
  // Live Bus Data
  const [buses, setBuses] = useState({});
  const [selectedBusId, setSelectedBusId] = useState(null);
  
  const stopNames = Object.keys(STOPS_DATA || {}).sort();

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

  const handleStartTracking = () => {
    if (!boardingPoint || !destination) {
      alert("Please select a boarding point and destination.");
      return;
    }
    setRouteConfirmed(true);
    setSelectedBusId(null);
  };

  const handleGoHome = () => {
    setBoardingPoint('');
    setDestination('');
    setRouteConfirmed(false);
    setSelectedBusId(null);
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
          const etaMins = Math.max(1, Math.round(dist / (bus.speed * 20))); 
          validBuses.push({ ...bus, dist, etaMins });
        }
      }
    });

    validBuses.sort((a, b) => a.etaMins - b.etaMins);
    return validBuses;
  }, [buses, routeConfirmed, boardingPoint, destination]);

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
        .modern-select { padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--off-white); font-size: 0.95rem; outline: none; transition: border 0.2s; appearance: none; width: 100%; }
        .modern-select:focus { border-color: var(--rtc-red); }
        
        .action-btn { width: 100%; background: var(--rtc-black); color: var(--clean-white); border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; margin-top: 5px; font-size: 0.95rem; }
        .action-btn:hover { background: var(--rtc-red); }
        .cancel-btn { width: 100%; background: var(--off-white); color: var(--text-main); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; margin-top: 10px; font-size: 0.95rem; }
        
        .results-list { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }
        .slide-card-item { background: var(--clean-white); border: 1px solid var(--border-color); border-radius: 10px; padding: 15px; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease; cursor: pointer; }
        .slide-card-item:hover { border-color: var(--rtc-red); box-shadow: 0 4px 12px rgba(0,0,0,0.03); transform: translateX(3px); }
        .slide-card-item.selected { border-color: var(--rtc-red); background: #FFF5F5; }
        .card-meta h4 { font-size: 0.95rem; font-weight: 700; margin-bottom: 4px; }
        .card-meta p { font-size: 0.8rem; color: var(--text-muted); }
        
        .badge-eta { background: rgba(227, 30, 36, 0.08); color: var(--rtc-red); padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; }
        
        .fullscreen-map { flex: 1; height: 100%; z-index: 1; position: relative; }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-5px); } to { opacity: 1; transform: translateX(0); } }
        
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
      `}</style>

      <aside className="sidebar-container">
        <div className="main-sidebar">
          <div className="brand"><h2>RTC</h2><span>LIVE</span></div>
          <nav className="nav-menu">
            <button className={`nav-btn ${activePanel === 'near-me' ? 'active' : ''}`} onClick={() => setActivePanel('near-me')}>
              <i className="fa-solid fa-location-crosshairs"></i><span>{t('Near Me', 'నా సమీపంలో')}</span>
            </button>
            <button className={`nav-btn ${activePanel === 'routes' ? 'active' : ''}`} onClick={() => setActivePanel('routes')}>
              <i className="fa-solid fa-route"></i><span>{t('Routes', 'మార్గాలు')}</span>
            </button>
            <button className={`nav-btn ${activePanel === 'live' ? 'active' : ''}`} onClick={() => setActivePanel('live')}>
              <i className="fa-solid fa-bus"></i><span>{t('Track Live', 'లైవ్ ట్రాక్')}</span>
            </button>
            <button className="nav-btn" onClick={() => setLang(lang === 'en' ? 'te' : 'en')}>
              <i className="fa-solid fa-language"></i><span>{lang === 'en' ? 'తెలుగు' : 'English'}</span>
            </button>
            <button className="nav-btn" onClick={onLogout}>
              <i className="fa-solid fa-sign-out-alt"></i><span>{t('Logout', 'లాగ్ అవుట్')}</span>
            </button>
          </nav>
        </div>

        <div className="slide-panels">
          {/* Near Me Panel */}
          <div className={`panel-content ${activePanel === 'near-me' ? 'active' : ''}`}>
             <h2>{t('Nearby Stations', 'సమీప స్టేషన్లు')}</h2>
             <p className="panel-desc">{t('We are currently using the Routes Panel for full system tracking.', 'మేము ప్రస్తుతం పూర్తి సిస్టమ్ ట్రాకింగ్ కోసం రూట్స్ ప్యానెల్‌ని ఉపయోగిస్తున్నాము.')}</p>
             <button className="action-btn" onClick={() => setActivePanel('routes')}>{t('Go to Routes', 'మార్గాలకు వెళ్లండి')}</button>
          </div>

          {/* Routes Panel */}
          <div className={`panel-content ${activePanel === 'routes' ? 'active' : ''}`}>
             <h2>{t('Find Buses', 'బస్సులను కనుగొనండి')}</h2>
             {!routeConfirmed ? (
               <>
                 <div className="input-group">
                     <label><i className="fa-solid fa-circle-dot" style={{color: 'green'}}></i> {t('Current Stop', 'ప్రస్తుత స్టాప్')}</label>
                     <select className="modern-select" value={boardingPoint} onChange={(e) => setBoardingPoint(e.target.value)}>
                       <option value="" disabled>{t('Select Current Location', 'ప్రస్తుత స్థానాన్ని ఎంచుకోండి')}</option>
                       {stopNames.map(stop => <option key={stop} value={stop}>{lang === 'te' && STOPS_TE[stop] ? STOPS_TE[stop] : stop}</option>)}
                     </select>
                 </div>
                 <div className="input-group">
                     <label><i className="fa-solid fa-location-dot" style={{color: 'var(--rtc-red)'}}></i> {t('Destination Stop', 'గమ్యం స్టాప్')}</label>
                     <select className="modern-select" value={destination} onChange={(e) => setDestination(e.target.value)}>
                       <option value="" disabled>{t('Select Destination', 'గమ్యాన్ని ఎంచుకోండి')}</option>
                       {stopNames.map(stop => <option key={stop} value={stop}>{lang === 'te' && STOPS_TE[stop] ? STOPS_TE[stop] : stop}</option>)}
                     </select>
                 </div>
                 <button className="action-btn" onClick={handleStartTracking}>{t('Search Fleet', 'శోధించండి')}</button>
               </>
             ) : (
               <>
                 <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', marginBottom: '15px' }}>
                   <p style={{ fontWeight: 'bold' }}>{lang === 'te' && STOPS_TE[boardingPoint] ? STOPS_TE[boardingPoint] : boardingPoint} <i className="fas fa-arrow-right" style={{margin:'0 10px', color:'var(--rtc-red)'}}></i> {lang === 'te' && STOPS_TE[destination] ? STOPS_TE[destination] : destination}</p>
                 </div>
                 <button className="cancel-btn" onClick={handleGoHome}>{t('Change Route', 'మార్గాన్ని మార్చండి')}</button>
                 
                 <div className="results-list">
                    {incomingBuses.length > 0 ? (
                      incomingBuses.map(bus => (
                        <div 
                          key={bus.id} 
                          className={`slide-card-item ${selectedBusId === bus.id ? 'selected' : ''}`}
                          style={{ borderLeft: '4px solid var(--rtc-red)' }}
                          onClick={() => setSelectedBusId(bus.id)}
                        >
                            <div className="card-meta">
                                <h4>{t('Route', 'రూట్')} {bus.routeId}</h4>
                                <p style={{ color: 'var(--rtc-red)', fontWeight: 'bold' }}>{t('Live Location', 'లైవ్ లొకేషన్')}</p>
                                <p>{bus.dist.toFixed(1)} km {t('away', 'దూరంలో')}</p>
                            </div>
                            <div className="badge-eta">{t('ETA', 'సమయం')}: {bus.etaMins} {t('min', 'నిమి')}</div>
                        </div>
                      ))
                    ) : (
                      <p className="panel-desc">{t('No active buses matching criteria right now.', 'ప్రస్తుతం యాక్టివ్ బస్సులు లేవు.')}</p>
                    )}
                 </div>
               </>
             )}
          </div>

          {/* Live Panel */}
          <div className={`panel-content ${activePanel === 'live' ? 'active' : ''}`}>
             <h2>{t('Live Telemetry', 'లైవ్ టెలిమెట్రీ')}</h2>
             <p className="panel-desc">{t('Track individual buses directly on the map.', 'మ్యాప్‌లో నేరుగా బస్సులను ట్రాక్ చేయండి.')}</p>
             <div className="results-list">
               {Object.values(buses).length > 0 ? Object.values(buses).map(bus => (
                 <div key={bus.id} className="slide-card-item" style={{ borderLeft: '4px solid #0087FF' }} onClick={() => setSelectedBusId(bus.id)}>
                    <div className="card-meta">
                        <h4>{t('Route', 'రూట్')} {bus.routeId || "Unknown"}</h4>
                        <p>{t('Bus ID', 'బస్సు ID')}: {bus.id}</p>
                    </div>
                    <i className="fa-solid fa-satellite-dish" style={{color: '#0087FF'}}></i>
                 </div>
               )) : (
                 <p className="panel-desc">{t('No buses broadcasting currently.', 'ప్రస్తుతం ప్రసారం అవుతున్న బస్సులు లేవు.')}</p>
               )}
             </div>
          </div>
        </div>
      </aside>

      <main className="fullscreen-map">
        <MapComponent 
          boardingPoint={boardingPoint} 
          destination={destination} 
          routeConfirmed={routeConfirmed} 
          selectedBusId={selectedBusId}
          buses={buses}
          lang={lang}
        />
        <AIChatWidget />
      </main>
    </div>
  );
}