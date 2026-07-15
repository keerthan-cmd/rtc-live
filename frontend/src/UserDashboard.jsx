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

export default function UserDashboard({ onLogout }) {
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
  
  // Geolocation for Near Me
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  
  // New UI states
  const [transportMode, setTransportMode] = useState('driving');
  const [serviceType, setServiceType] = useState('All');
  const [searchRouteInput, setSearchRouteInput] = useState('');
  
  // Favorites State
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('rtc_favorites');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: 'Home to Work', route: '38Y', type: 'Metro Express', iconBg: '#0087FF', icon: 'fa-briefcase' },
      { id: '2', name: 'Market Trip', route: '600', type: 'City Ordinary', iconBg: 'var(--rtc-red)', icon: 'fa-cart-shopping' }
    ];
  });
  const [showAddFav, setShowAddFav] = useState(false);
  const [newFavName, setNewFavName] = useState('');
  const [newFavRoute, setNewFavRoute] = useState('');

  // Feedback State
  const [feedbackCategory, setFeedbackCategory] = useState('Suggestion');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('');
  
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

  // Request location for Near Me panel
  useEffect(() => {
    if (activePanel === 'near-me') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation([position.coords.latitude, position.coords.longitude]);
            setLocationError(null);
          },
          () => {
            setLocationError("Unable to retrieve location.");
          }
        );
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocationError("Geolocation is not supported by this browser.");
      }
    }
  }, [activePanel]);

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

  const handleAddFavorite = () => {
    if (!newFavName || !newFavRoute) return;
    const sType = newFavRoute.includes('Y') || newFavRoute.includes('K') ? 'Metro Express' : (newFavRoute === '211' || newFavRoute === '400' ? 'Metro Luxury' : 'City Ordinary');
    const sColor = sType === 'City Ordinary' ? 'var(--rtc-red)' : (sType === 'Metro Express' ? '#0087FF' : '#00B140');
    const newFav = {
      id: Date.now().toString(),
      name: newFavName,
      route: newFavRoute,
      type: sType,
      iconBg: sColor,
      icon: 'fa-star'
    };
    const updatedFavorites = [...favorites, newFav];
    setFavorites(updatedFavorites);
    localStorage.setItem('rtc_favorites', JSON.stringify(updatedFavorites));
    setNewFavName('');
    setNewFavRoute('');
    setShowAddFav(false);
  };

  const handleSOS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          alert(`SOS Emergency alert dispatched!\nLocation Sent: Lat ${position.coords.latitude.toFixed(4)}, Lng ${position.coords.longitude.toFixed(4)}`);
        },
        () => {
          alert("SOS Alert dispatched! (Unable to attach location)");
        }
      );
    } else {
      alert("SOS Alert dispatched! (Geolocation not supported)");
    }
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackText) return;
    setFeedbackStatus('Submitting...');
    setTimeout(() => {
      setFeedbackStatus('Thank you for your feedback!');
      setFeedbackText('');
      setTimeout(() => setFeedbackStatus(''), 3000);
    }, 1000);
  };

  // Calculate incoming buses dynamically
  const incomingBuses = useMemo(() => {
    if (!routeConfirmed || !boardingPoint || !destination) return [];
    
    const startCoords = STOPS_DATA[boardingPoint];
    if (!startCoords) return [];

    let validBuses = [];
    Object.entries(buses).forEach(([busId, bus]) => {
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
          validBuses.push({ ...bus, id: busId, dist, etaMins });
        }
      }
    });

    validBuses.sort((a, b) => a.etaMins - b.etaMins);
    return validBuses;
  }, [buses, routeConfirmed, boardingPoint, destination]);

  // Auto-select first incoming bus
  useEffect(() => {
    if (routeConfirmed && incomingBuses.length > 0 && !selectedBusId && activePanel === 'routes') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedBusId(incomingBuses[0].id);
    }
  }, [routeConfirmed, incomingBuses, selectedBusId, activePanel]);

  // Calculate nearby buses for Near Me panel
  const nearbyBuses = useMemo(() => {
    if (!userLocation) return [];
    let nearby = [];
    Object.entries(buses).forEach(([busId, bus]) => {
      const dist = getDistanceFromLatLonInKm(bus.lat, bus.lng, userLocation[0], userLocation[1]);
      if (dist <= 15) { 
        nearby.push({ ...bus, id: busId, dist });
      }
    });
    nearby.sort((a, b) => a.dist - b.dist);
    return nearby;
  }, [buses, userLocation]);

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
        
        .slide-panels { flex: 1; padding: 30px 20px; background: var(--clean-white); overflow-y: auto; overflow-x: hidden; }
        .slide-panels::-webkit-scrollbar { width: 6px; }
        .slide-panels::-webkit-scrollbar-track { background: var(--off-white); }
        .slide-panels::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        .slide-panels::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
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

        /* NEW UI STYLES */
        .transport-modes { display: flex; gap: 8px; margin-bottom: 15px; }
        .mode-btn { flex: 1; padding: 8px; border: 1px solid var(--border-color); background: var(--clean-white); border-radius: 6px; cursor: pointer; transition: 0.2s; font-size: 0.8rem; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 6px; color: var(--text-main); }
        .mode-btn.active { background: var(--rtc-black); color: var(--clean-white); border-color: var(--rtc-black); }
        
        .search-box-row { display: flex; gap: 8px; margin-bottom: 15px; }
        .search-box-row input { flex: 1; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--off-white); font-size: 0.95rem; outline: none; }
        .search-box-row input:focus { border-color: var(--rtc-red); }
        .search-box-row button { background: var(--rtc-red); color: var(--clean-white); border: none; padding: 0 16px; border-radius: 8px; cursor: pointer; transition: background 0.2s; }
        
        .telemetry-dashboard { background: var(--off-white); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 12px; }
        .crowd-meter-bg { width: 100%; height: 8px; background: #E0E0E0; border-radius: 4px; overflow: hidden; }
        .crowd-meter-fill { height: 100%; transition: width 0.5s ease-in-out; }
        
        .smart-advice-box { display: flex; align-items: center; gap: 12px; background: #FFF5F5; border-left: 4px solid var(--rtc-red); padding: 12px; border-radius: 4px; margin-bottom: 20px; }
        
        .route-timeline { position: relative; padding-left: 25px; margin-top: 20px; }
        .route-timeline::before { content: ''; position: absolute; left: 8px; top: 5px; bottom: 5px; width: 4px; background: var(--border-color); border-radius: 2px; }
        .timeline-stop { position: relative; margin-bottom: 25px; }
        .timeline-stop::before { content: ''; position: absolute; left: -25px; top: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--clean-white); border: 4px solid var(--border-color); z-index: 2; }
        .timeline-stop.active-stop::before { border-color: var(--rtc-red); background: var(--rtc-red); box-shadow: 0 0 0 4px rgba(227, 30, 36, 0.2); }
        .timeline-stop h4 { font-size: 0.95rem; margin-bottom: 3px; color: var(--text-main); }
        
        .fav-card { cursor: pointer; border: none; background: #FAFAFA; margin-bottom: 12px; }
        .fav-card:hover { background: #FFF; border: 1px solid var(--border-color); transform: translateY(-2px); box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .fav-icon-box { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; }
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
            <button className={`nav-btn ${activePanel === 'favorites' ? 'active' : ''}`} onClick={() => setActivePanel('favorites')}>
              <i className="fa-solid fa-star"></i><span>{t('Favourites', 'ఇష్టమైనవి')}</span>
            </button>
            <button className={`nav-btn ${activePanel === 'emergency' ? 'active' : ''}`} onClick={() => setActivePanel('emergency')} style={{color: activePanel==='emergency' ? 'var(--rtc-red)' : ''}}>
              <i className="fa-solid fa-triangle-exclamation"></i><span>{t('SOS', 'అత్యవసరం')}</span>
            </button>
            <button className={`nav-btn ${activePanel === 'feedback' ? 'active' : ''}`} onClick={() => setActivePanel('feedback')}>
              <i className="fa-solid fa-comment-dots"></i><span>{t('Feedback', 'అభిప్రాయం')}</span>
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
             <h2>{t('Nearby Stations', 'సమీప బస్సులు')}</h2>
             <p className="panel-desc">{t('Select transport mode and click a station to calculate your exact travel route.', 'రవాణా మోడ్‌ను ఎంచుకోండి...')}</p>
             <div className="transport-modes">
                 <button className={`mode-btn ${transportMode === 'foot' ? 'active' : ''}`} onClick={() => setTransportMode('foot')}><i className="fa-solid fa-person-walking"></i> Walk</button>
                 <button className={`mode-btn ${transportMode === 'bike' ? 'active' : ''}`} onClick={() => setTransportMode('bike')}><i className="fa-solid fa-bicycle"></i> Bike</button>
                 <button className={`mode-btn ${transportMode === 'driving' ? 'active' : ''}`} onClick={() => setTransportMode('driving')}><i className="fa-solid fa-car"></i> Car</button>
             </div>
             
             {locationError && <p style={{ color: 'var(--rtc-red)' }}>{locationError}</p>}
             {!userLocation && !locationError && <p>{t('Getting your location...', 'మీ స్థానాన్ని పొందుతోంది...')}</p>}
             
             {userLocation && (
               <div className="results-list">
                 {nearbyBuses.length > 0 ? nearbyBuses.map(bus => (
                   <div 
                     key={bus.id} 
                     className={`slide-card-item ${selectedBusId === bus.id ? 'selected' : ''}`} 
                     style={{ borderLeft: '4px solid #10b981' }} 
                     onClick={() => setSelectedBusId(selectedBusId === bus.id ? null : bus.id)}
                   >
                      <div className="card-meta">
                          <h4>{t('Route', 'రూట్')} {bus.routeId || "Unknown"}</h4>
                          <p>{bus.dist.toFixed(1)} km {t('away', 'దూరంలో')}</p>
                      </div>
                      <i className="fa-solid fa-location-dot" style={{color: '#10b981'}}></i>
                   </div>
                 )) : (
                   <p className="panel-desc">{t('No active buses nearby.', 'సమీపంలో యాక్టివ్ బస్సులు లేవు.')}</p>
                 )}
               </div>
             )}
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
                 <div className="input-group">
                     <label><i className="fa-solid fa-bus-simple"></i> {t('Service Type', 'బస్సు రకం')}</label>
                     <select className="modern-select" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                         <option value="All">{t('All Types', 'అన్ని రకాలు')}</option>
                         <option value="City Ordinary">{t('City Ordinary (Red)', 'సిటీ ఆర్డినరీ (ఎరుపు)')}</option>
                         <option value="Metro Express">{t('Metro Express (Blue)', 'మెట్రో ఎక్స్‌ప్రెస్ (నీలం)')}</option>
                         <option value="Metro Luxury">{t('Metro Luxury (Green)', 'మెట్రో లగ్జరీ (ఆకుపచ్చ)')}</option>
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
                    {incomingBuses.filter(bus => {
                        if (serviceType === 'All') return true;
                        let sType = 'City Ordinary';
                        if (bus.routeId.includes('Y') || bus.routeId.includes('K')) sType = 'Metro Express';
                        if (bus.routeId === '211' || bus.routeId === '400') sType = 'Metro Luxury';
                        return sType === serviceType;
                     }).length > 0 ? (
                       incomingBuses.filter(bus => {
                           if (serviceType === 'All') return true;
                           let sType = 'City Ordinary';
                           if (bus.routeId.includes('Y') || bus.routeId.includes('K')) sType = 'Metro Express';
                           if (bus.routeId === '211' || bus.routeId === '400') sType = 'Metro Luxury';
                           return sType === serviceType;
                       }).map(bus => {
                           let sType = 'City Ordinary';
                           if (bus.routeId.includes('Y') || bus.routeId.includes('K')) sType = 'Metro Express';
                           if (bus.routeId === '211' || bus.routeId === '400') sType = 'Metro Luxury';
                           let sColor = sType === 'City Ordinary' ? 'var(--rtc-red)' : (sType === 'Metro Express' ? '#0087FF' : '#00B140');
                           return (
                             <div 
                               key={bus.id} 
                               className={`slide-card-item ${selectedBusId === bus.id ? 'selected' : ''}`}
                               style={{ borderLeft: `4px solid ${sColor}` }}
                               onClick={() => setSelectedBusId(selectedBusId === bus.id ? null : bus.id)}
                             >
                                 <div className="card-meta">
                                     <h4>{t('Route', 'రూట్')} {bus.routeId}</h4>
                                     <p style={{ color: sColor, fontWeight: 'bold' }}>{sType}</p>
                                     <p>{bus.dist.toFixed(1)} km {t('away', 'దూరంలో')}</p>
                                 </div>
                                 <div className="badge-eta" style={{backgroundColor: sColor + '1A', color: sColor}}>{t('ETA', 'సమయం')}: {bus.etaMins} {t('min', 'నిమి')}</div>
                             </div>
                           );
                       })
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
             <div className="search-box-row">
                 <input type="text" placeholder="Enter Route (e.g., 38Y)" value={searchRouteInput} onChange={e => setSearchRouteInput(e.target.value)} />
                 <button><i className="fa-solid fa-magnifying-glass"></i></button>
             </div>
             
             {selectedBusId && buses[selectedBusId] ? (
               <div style={{marginTop: '15px'}}>
                 <button className="cancel-btn" onClick={() => setSelectedBusId(null)}>Back to List</button>
                 {(() => {
                   const b = buses[selectedBusId];
                   let sType = 'City Ordinary';
                   if (b.routeId && (b.routeId.includes('Y') || b.routeId.includes('K'))) sType = 'Metro Express';
                   if (b.routeId === '211' || b.routeId === '400') sType = 'Metro Luxury';
                   
                   let cLevel = b.occupancy === "Full" ? 'High' : (b.occupancy === "Moderate" ? 'Medium' : 'Low');
                   let cColor = cLevel === 'High' ? 'var(--rtc-red)' : (cLevel === 'Medium' ? '#f39c12' : '#27ae60');
                   let cWidth = cLevel === 'High' ? '90%' : (cLevel === 'Medium' ? '50%' : '20%');

                   return (
                     <div style={{marginTop: '15px'}}>
                       <div className="telemetry-dashboard">
                           <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                               <span style={{fontWeight:'bold'}}>{sType}</span>
                               <span style={{color:cColor, fontWeight:'bold'}}>{cLevel} Capacity</span>
                           </div>
                           <div className="crowd-meter-bg"><div className="crowd-meter-fill" style={{width:cWidth, background:cColor}}></div></div>
                       </div>
                       
                       {cLevel === 'High' && (
                         <div className="smart-advice-box">
                            <i className="fa-solid fa-triangle-exclamation" style={{fontSize:'1.5rem', color:'var(--rtc-red)'}}></i>
                            <div>
                                <strong>Highly Overcrowded</strong>
                                <p style={{fontSize:'0.8rem', marginTop:'2px'}}>We recommend waiting for the next bus arriving soon.</p>
                            </div>
                         </div>
                       )}

                       <div className="route-timeline">
                         {ROUTES_DATA[b.routeId] && ROUTES_DATA[b.routeId].slice(0, 3).map((stopId, i) => (
                           <div key={i} className={`timeline-stop ${i === 0 ? 'active-stop' : ''}`}>
                               <h4>{lang === 'te' && STOPS_TE[stopId] ? STOPS_TE[stopId] : stopId}</h4>
                               {i === 0 && <p style={{color:'var(--rtc-red)', fontWeight:'bold'}}>Bus is approaching...</p>}
                           </div>
                         ))}
                       </div>
                     </div>
                   );
                 })()}
               </div>
             ) : (
               <div className="results-list" style={{marginTop:'15px'}}>
                 {Object.entries(buses)
                   .filter(([, bus]) => !searchRouteInput || (bus.routeId && bus.routeId.toLowerCase().includes(searchRouteInput.toLowerCase())))
                   .map(([busId, bus]) => {
                     let sType = 'City Ordinary';
                     if (bus.routeId && (bus.routeId.includes('Y') || bus.routeId.includes('K'))) sType = 'Metro Express';
                     if (bus.routeId === '211' || bus.routeId === '400') sType = 'Metro Luxury';
                     let sColor = sType === 'City Ordinary' ? 'var(--rtc-red)' : (sType === 'Metro Express' ? '#0087FF' : '#00B140');
                     
                     return (
                       <div key={busId} className="slide-card-item" style={{ borderLeft: `4px solid ${sColor}` }} onClick={() => setSelectedBusId(busId)}>
                          <div className="card-meta">
                              <h4>{t('Route', 'రూట్')} {bus.routeId || "Unknown"}</h4>
                              <p style={{color:sColor, fontWeight:'bold'}}>{sType}</p>
                          </div>
                          <i className="fa-solid fa-satellite-dish" style={{color: sColor}}></i>
                       </div>
                     );
                 })}
                 {Object.keys(buses).length === 0 && (
                   <p className="panel-desc">{t('No buses broadcasting currently.', 'ప్రస్తుతం ప్రసారం అవుతున్న బస్సులు లేవు.')}</p>
                 )}
               </div>
             )}
           </div>

           {/* Favorites Panel */}
           <div className={`panel-content ${activePanel === 'favorites' ? 'active' : ''}`}>
             <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px'}}>
               <h2 style={{margin:0}}>{t('Quick Actions', 'త్వరిత చర్యలు')}</h2>
               <button onClick={() => setShowAddFav(!showAddFav)} style={{background:'var(--rtc-red)', color:'white', border:'none', borderRadius:'50%', width:'30px', height:'30px', cursor:'pointer', display:'flex', justifyContent:'center', alignItems:'center'}}>
                 <i className={`fa-solid ${showAddFav ? 'fa-minus' : 'fa-plus'}`}></i>
               </button>
             </div>
             <p className="panel-desc">{t('One-tap tracking for your daily commutes.', 'మీ రోజువారీ ప్రయాణాలకు ఒక ట్యాప్ ట్రాకింగ్.')}</p>
             
             {showAddFav && (
               <div style={{background:'var(--off-white)', padding:'15px', borderRadius:'8px', border:'1px solid var(--border-color)', marginBottom:'15px'}}>
                 <div className="input-group">
                   <label>Favorite Name</label>
                   <input type="text" placeholder="e.g. Gym Route" value={newFavName} onChange={e => setNewFavName(e.target.value)} />
                 </div>
                 <div className="input-group">
                   <label>Route Number</label>
                   <input type="text" placeholder="e.g. 211" value={newFavRoute} onChange={e => setNewFavRoute(e.target.value)} />
                 </div>
                 <button className="action-btn" onClick={handleAddFavorite}>Save Favorite</button>
               </div>
             )}

             <div className="results-list">
                 {favorites.map((fav) => (
                   <div key={fav.id} className="slide-card-item fav-card" onClick={() => { setSearchRouteInput(fav.route); setActivePanel('live'); }}>
                       <div className="fav-icon-box" style={{background: fav.iconBg}}><i className={`fa-solid ${fav.icon}`}></i></div>
                       <div className="card-meta"><h4>{fav.name}</h4><p>Route {fav.route} • {fav.type}</p></div>
                       <i className="fa-solid fa-chevron-right text-muted"></i>
                   </div>
                 ))}
             </div>
           </div>

           {/* Emergency Panel */}
           <div className={`panel-content ${activePanel === 'emergency' ? 'active' : ''}`}>
             <h2>{t('Emergency (SOS)', 'అత్యవసరం (SOS)')}</h2>
             <p className="panel-desc">{t('Instantly share your live location or contact emergency services.', 'మీ లైవ్ లొకేషన్‌ను తక్షణమే షేర్ చేయండి.')}</p>
             
             <div style={{background:'#FFF5F5', border:'1px solid var(--rtc-red)', borderRadius:'12px', padding:'25px', textAlign:'center', marginBottom:'20px'}}>
               <button onClick={handleSOS} style={{background:'var(--rtc-red)', color:'white', border:'none', borderRadius:'50%', width:'100px', height:'100px', cursor:'pointer', fontSize:'1.5rem', fontWeight:'bold', boxShadow:'0 8px 20px rgba(227, 30, 36, 0.4)', transition:'transform 0.2s'}} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                 SOS
               </button>
               <p style={{color:'var(--rtc-red)', fontWeight:'bold', marginTop:'15px', fontSize:'0.9rem'}}>Tap to dispatch alert</p>
             </div>

             <div className="results-list">
                <a href="tel:100" className="slide-card-item fav-card" style={{textDecoration:'none'}}>
                    <div className="fav-icon-box" style={{background:'#111'}}><i className="fa-solid fa-building-shield"></i></div>
                    <div className="card-meta"><h4>Police Control Room</h4><p>Dial 100</p></div>
                    <i className="fa-solid fa-phone" style={{color:'#111'}}></i>
                </a>
                <a href="tel:108" className="slide-card-item fav-card" style={{textDecoration:'none'}}>
                    <div className="fav-icon-box" style={{background:'#0087FF'}}><i className="fa-solid fa-truck-medical"></i></div>
                    <div className="card-meta"><h4>Ambulance</h4><p>Dial 108</p></div>
                    <i className="fa-solid fa-phone" style={{color:'#0087FF'}}></i>
                </a>
                <a href="tel:1091" className="slide-card-item fav-card" style={{textDecoration:'none'}}>
                    <div className="fav-icon-box" style={{background:'#e84393'}}><i className="fa-solid fa-person-dress"></i></div>
                    <div className="card-meta"><h4>Women Helpline</h4><p>Dial 1091</p></div>
                    <i className="fa-solid fa-phone" style={{color:'#e84393'}}></i>
                </a>
             </div>
           </div>

           {/* Feedback Panel */}
           <div className={`panel-content ${activePanel === 'feedback' ? 'active' : ''}`}>
             <h2>{t('Feedback', 'అభిప్రాయం')}</h2>
             <p className="panel-desc">{t('Help us improve the RTC Live experience.', 'RTC లైవ్ అనుభవాన్ని మెరుగుపరచడంలో మాకు సహాయపడండి.')}</p>
             
             {feedbackStatus ? (
               <div style={{background:'#E6F4EA', color:'#137333', padding:'15px', borderRadius:'8px', textAlign:'center', fontWeight:'bold', border:'1px solid #CEEAD6'}}>
                 <i className="fa-solid fa-circle-check" style={{fontSize:'2rem', marginBottom:'10px'}}></i>
                 <p>{feedbackStatus}</p>
               </div>
             ) : (
               <div style={{background:'var(--off-white)', padding:'20px', borderRadius:'12px', border:'1px solid var(--border-color)'}}>
                 <div className="input-group">
                   <label>Category</label>
                   <select className="modern-select" value={feedbackCategory} onChange={e => setFeedbackCategory(e.target.value)}>
                       <option>Suggestion</option>
                       <option>Bug Report</option>
                       <option>Route Issue</option>
                   </select>
                 </div>
                 <div className="input-group">
                   <label>Message</label>
                   <textarea rows="5" placeholder="Tell us what you think..." value={feedbackText} onChange={e => setFeedbackText(e.target.value)} style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid var(--border-color)', resize:'vertical', fontFamily:'inherit', background:'var(--clean-white)'}}></textarea>
                 </div>
                 <button className="action-btn" onClick={handleFeedbackSubmit}>Submit Feedback</button>
               </div>
             )}
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
          userLocation={userLocation}
          activePanel={activePanel}
          transportMode={transportMode}
        />
        <AIChatWidget 
          buses={buses}
          incomingBuses={incomingBuses}
          nearbyBuses={nearbyBuses}
          boardingPoint={boardingPoint}
          destination={destination}
        />
      </main>
    </div>
  );
}