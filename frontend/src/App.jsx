import { useState, useEffect, useRef } from "react";
import { HashRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import emailjs from '@emailjs/browser';
import { database } from "./firebase"; 
import { ref, set, onValue, get, child } from "firebase/database";
import AuthPage from "./AuthPage";
import OTPPage from "./OTPPage";
import appLogo from "./logo.png";
import UserDashboard from "./UserDashboard";
import DriverDashboard from "./DriverDashboard";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" }}>
        <img src={appLogo} alt="RTC Logo Splash" style={{ width: "200px", maxWidth: "80%", animation: "splashFade 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards" }} />
      </div>
    );
  }

  return (
    <Router>
      <div style={{ fontFamily: "sans-serif", color: "#333", backgroundColor: "#f1f5f9", minHeight: "100vh" }}>
        <Routes>
          <Route path="/" element={<AuthFlow />} />
          <Route path="/user" element={<UserView />} />
          <Route path="/driver" element={<DriverDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

function AuthFlow() {
  const [step, setStep] = useState("auth"); 
  const [authData, setAuthData] = useState({ email: "", role: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [forceView, setForceView] = useState("login"); 
  const navigate = useNavigate();

  const EMAILJS_SERVICE_ID = "service_ptdw81u";
  const EMAILJS_TEMPLATE_ID = "template_p59ei6h";
  const EMAILJS_PUBLIC_KEY = "7b6J029zSFh5lvWQ8";

  useEffect(() => {
    const savedSession = localStorage.getItem("rtc_session");
    if (savedSession) {
      const userData = JSON.parse(savedSession);
      navigate(`/${userData.role.toLowerCase()}`);
    }
  }, [navigate]);

  const sanitizeEmail = (email) => email.replace(/\./g, ',');

  const checkIsAllowedAdmin = async (email, safeEmail) => {
    try {
      const snap = await get(child(ref(database), `allowed_admins`));
      if (!snap.exists()) return false;
      const data = snap.val();
      if (Array.isArray(data)) return data.includes(email);
      const keys = Object.keys(data);
      const values = Object.values(data);
      return keys.includes(safeEmail) || values.includes(email);
    } catch (e) {
      console.error("Error checking allowed_admins:", e);
      return false;
    }
  };

  const handleLogin = async (data) => {
    if (!data.email || !data.password) return alert("Please provide email and password.");
    
    setIsProcessing(true);
    const safeEmail = sanitizeEmail(data.email);

    // Admin RBAC Check (Firebase Dynamic Node)
    if (data.role === "Admin") {
      const isAllowed = await checkIsAllowedAdmin(data.email.toLowerCase(), safeEmail);
      if (!isAllowed) {
        setIsProcessing(false);
        return alert("Unauthorized: This email is not in the Firebase allowed admins node.");
      }
    }
    
    try {
      const accountSnapshot = await get(child(ref(database), `accounts/${data.role}/${safeEmail}`));
      if (!accountSnapshot.exists()) {
        alert("Account not found. Please sign up.");
        setForceView("signup"); 
      } else {
        const account = accountSnapshot.val();
        if (account.password === data.password) {
          localStorage.setItem("rtc_session", JSON.stringify({ role: data.role, email: data.email, timestamp: Date.now() }));
          navigate(`/${data.role.toLowerCase()}`);
        } else {
          alert("Incorrect password.");
        }
      }
    } catch {
      alert("System error during login.");
    }
    setIsProcessing(false);
  };

  const handleSignUp = async (data) => {
    if (!data.email || !data.password) return alert("Please fill out all fields.");
    
    setIsProcessing(true);
    const safeEmail = sanitizeEmail(data.email);

    // Admin RBAC Check (Firebase Dynamic Node)
    if (data.role === "Admin") {
      const isAllowed = await checkIsAllowedAdmin(data.email.toLowerCase(), safeEmail);
      if (!isAllowed) {
        setIsProcessing(false);
        return alert("Unauthorized: You cannot create an Admin account with this email. It is not in Firebase allowed_admins.");
      }
    }
    
    try {
      const accountSnapshot = await get(child(ref(database), `accounts/${data.role}/${safeEmail}`));
      if (accountSnapshot.exists()) {
        alert("Account already exists! Please log in.");
        setForceView("login");
      } else {
        await set(ref(database, `accounts/${data.role}/${safeEmail}`), {
          email: data.email, password: data.password, role: data.role, createdAt: Date.now()
        });
        localStorage.setItem("rtc_session", JSON.stringify({ role: data.role, email: data.email, timestamp: Date.now() }));
        navigate(`/${data.role.toLowerCase()}`);
      }
    } catch {
      alert("Error creating account.");
    }
    setIsProcessing(false);
  };

  const handleForgotPassword = async (data) => {
    if (!data.email) return alert("Please enter your email.");
    setIsProcessing(true);
    const safeEmail = sanitizeEmail(data.email);
    
    try {
      // 1. Ensure the account actually exists before resetting
      const accountSnapshot = await get(child(ref(database), `accounts/${data.role}/${safeEmail}`));
      if (!accountSnapshot.exists()) {
        alert(`No ${data.role} account found with that email. Please sign up first.`);
        setIsProcessing(false);
        return;
      }
      
      // 2. Generate and log the OTP for the developer
      const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
      await set(ref(database, `temporary_otps/${safeEmail}`), { code: generatedOTP, timestamp: Date.now() });
      
      // 3. Try to email the user, but don't break if EmailJS blocks it
      try {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { to_email: data.email, otp_code: generatedOTP }, EMAILJS_PUBLIC_KEY);
      } catch (emailError) {
        console.error("EmailJS Full Error:", emailError);
        alert(`Email system error: ${emailError?.text || emailError?.message || "Unknown API rejection"}\nPlease check your EmailJS dashboard setup.`);
      }

      setAuthData({ email: data.email, role: data.role });
      setStep("otp");

    } catch {
      alert("Database error. Please check your connection.");
    }
    setIsProcessing(false);
  };

  const handleVerifyOTP = async (enteredCode) => {
    setIsProcessing(true);
    const safeEmail = sanitizeEmail(authData.email);
    try {
      const otpSnapshot = await get(child(ref(database), `temporary_otps/${safeEmail}`));
      if (otpSnapshot.exists() && otpSnapshot.val().code === enteredCode) {
        await set(ref(database, `temporary_otps/${safeEmail}`), null);
        setStep("reset");
      } else {
        alert("Invalid or expired OTP.");
      }
    } catch {
      alert("Error verifying code.");
    }
    setIsProcessing(false);
  };

  const handleResetPassword = async (newPassword) => {
    if (!newPassword) return alert("Please enter a new password.");
    setIsProcessing(true);
    const safeEmail = sanitizeEmail(authData.email);
    try {
      await set(ref(database, `accounts/${authData.role}/${safeEmail}/password`), newPassword);
      alert("Password updated! You can now log in.");
      setStep("auth");
      setForceView("login");
    } catch {
      alert("Error updating password.");
    }
    setIsProcessing(false);
  };

  if (step === "auth") {
    return (
      <div style={{ pointerEvents: isProcessing ? 'none' : 'auto', opacity: isProcessing ? 0.7 : 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <AuthPage requestedView={forceView} onLogin={handleLogin} onSignUp={handleSignUp} onForgotPassword={handleForgotPassword} />
        {isProcessing && <p style={{textAlign: 'center', fontWeight: 'bold'}}>Processing...</p>}
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <OTPPage email={authData.email} role={authData.role} onVerify={handleVerifyOTP} onGoBack={() => setStep("auth")} />
      </div>
    );
  }

  if (step === "reset") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
          <img src={appLogo} alt="RTC Logo" style={{ height: '60px', marginBottom: '20px' }} />
          <h2 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>Set New Password</h2>
          <input type="password" placeholder="New Password" id="new-pwd" style={{ padding: '15px', marginBottom: '20px', fontSize: '18px', width: '100%', borderRadius: '8px', border: '2px solid #e2e8f0', boxSizing: 'border-box' }} />
          <button onClick={() => handleResetPassword(document.getElementById('new-pwd').value)} style={{ width: '100%', padding: '15px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
            Save & Login
          </button>
        </div>
      </div>
    );
  }
}

function UserView() {
  const navigate = useNavigate();
  
  // Gets the saved user email so we can say "Welcome, [Name]!" on the dashboard
  const savedSession = JSON.parse(localStorage.getItem("rtc_session") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("rtc_session");
    navigate("/");
  };

  return <UserDashboard userEmail={savedSession.email} onLogout={handleLogout} />;
}

// DriverDashboard is imported from DriverDashboard.jsx

const adminBusIcon = new L.divIcon({
  className: "custom-bus-icon",
  html: `<div style="width: 24px; height: 48px; background: #0087FF; border-radius: 6px; border: 2px solid #000; box-shadow: 0 4px 10px rgba(0,0,0,0.4);"></div>`,
  iconSize: [24, 48],
  iconAnchor: [12, 24]
});

const emergencyBusIcon = new L.divIcon({
  className: "custom-bus-icon pulse-red",
  html: `<div style="width: 24px; height: 48px; background: #E31E24; border-radius: 6px; border: 2px solid #000; box-shadow: 0 0 15px rgba(227,30,36,0.8);"></div>`,
  iconSize: [24, 48],
  iconAnchor: [12, 24]
});

function AdminDashboard() {
  const [activeBuses, setActiveBuses] = useState({});
  const [activePanel, setActivePanel] = useState('fleet');
  const [suggestions, setSuggestions] = useState({});
  
  // Settings State
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [refreshRate, setRefreshRate] = useState(() => localStorage.getItem('mapRefresh') || 'Real-time');
  const navigate = useNavigate();
  
  const alertedBuses = useRef(new Set());

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('mapRefresh', refreshRate);
  }, [refreshRate]);

  const handleLogout = () => {
    localStorage.removeItem("rtc_session");
    navigate("/");
  };

  const handleDeleteBus = (busId) => {
    if (window.confirm(`Are you sure you want to stop tracking Bus ${busId}?`)) {
      set(ref(database, `buses/${busId}`), null);
    }
  };

  useEffect(() => {
    const unsubscribe = onValue(ref(database, 'buses'), (snapshot) => { 
        const data = snapshot.val() || {};
        setActiveBuses(data); 
        
        // Check for new emergencies
        Object.entries(data).forEach(([busId, bus]) => {
            if (bus.alert === true && !alertedBuses.current.has(busId)) {
                alertedBuses.current.add(busId);
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("🚨 RTC Live Emergency Alert", {
                        body: `Bus ${busId} (Route ${bus.routeId}) reported heavy traffic or an emergency!`,
                        icon: '/logo.png'
                    });
                }
            } else if (!bus.alert && alertedBuses.current.has(busId)) {
                alertedBuses.current.delete(busId);
            }
        });
    });
    return () => unsubscribe(); 
  }, []);

  useEffect(() => {
    const unsubscribe = onValue(ref(database, 'suggestions'), (snapshot) => {
      setSuggestions(snapshot.val() || {});
    });
    return () => unsubscribe();
  }, []);

  const [currentTime, setCurrentTime] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  const totalBuses = Object.keys(activeBuses).length;
  let alertCount = 0;
  
  Object.values(activeBuses).forEach(bus => {
    if ((currentTime - bus.lastUpdated > 60000) || bus.alert === true) {
      alertCount++;
    }
  });

  const onTimePercentage = totalBuses === 0 ? 100 : Math.round(((totalBuses - alertCount) / totalBuses) * 1000) / 10;
  const vizagCenter = [17.6868, 83.2185];

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
        body { margin: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .app-wrapper { display: flex; width: 100vw; height: 100vh; color: var(--text-main); overflow: hidden; background: var(--off-white); }
        
        .sidebar-container { display: flex; width: 480px; height: 100%; background: var(--clean-white); border-right: 1px solid var(--border-color); z-index: 10; box-shadow: 4px 0 25px rgba(0,0,0,0.05); }
        .main-sidebar { width: 90px; height: 100%; background: var(--rtc-black); display: flex; flex-direction: column; align-items: center; padding: 20px 0; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; -ms-overflow-style: none; }
        .main-sidebar::-webkit-scrollbar { display: none; }
        
        .brand h2 { color: var(--clean-white); font-size: 1.4rem; font-weight: 800; text-align: center; }
        .brand span { color: #0087FF; font-size: 0.8rem; font-weight: 700; letter-spacing: 2px; display: block; text-align: center; }
        
        .nav-menu { margin-top: 50px; display: flex; flex-direction: column; gap: 20px; width: 100%; }
        .nav-btn { background: transparent; border: none; color: var(--text-muted); padding: 15px 0; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; transition: all 0.3s ease; }
        .nav-btn i { font-size: 20px; }
        .nav-btn span { font-size: 0.7rem; font-weight: 600; }
        .nav-btn:hover, .nav-btn.active { color: var(--clean-white); background: rgba(255, 255, 255, 0.05); border-left: 4px solid #0087FF; }
        
        .slide-panels { flex: 1; padding: 30px 20px; background: var(--clean-white); overflow-y: auto; min-height: 0; }
        .panel-content { display: none; }
        .panel-content.active { display: block; animation: fadeIn 0.4s ease; }
        .panel-content h2 { font-size: 1.4rem; font-weight: 700; margin-bottom: 5px; }
        .panel-desc { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 15px; line-height: 1.4; }
        
        .metric-card { background: var(--off-white); border: 1px solid var(--border-color); border-radius: 10px; padding: 15px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .metric-card.alert { background: #FFF5F5; border-color: #FEB2B2; color: #C53030; }
        .metric-card h1 { font-size: 2rem; margin: 0; color: #0087FF; }
        .metric-card.alert h1 { color: #E31E24; }
        .metric-card p { font-size: 0.85rem; font-weight: 600; text-transform: uppercase; margin: 0; }
        
        .slide-card-item { background: var(--clean-white); border: 1px solid var(--border-color); border-radius: 10px; padding: 15px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; transition: all 0.2s ease; }
        .card-meta h4 { font-size: 0.95rem; font-weight: 700; margin-bottom: 4px; }
        .card-meta p { font-size: 0.8rem; color: var(--text-muted); }
        
        .fullscreen-map { flex: 1; height: 100%; z-index: 1; position: relative; }
        
        .settings-row { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid var(--border-color); }
        .settings-row h4 { font-size: 1rem; margin-bottom: 5px; }
        .settings-row p { font-size: 0.8rem; color: var(--text-muted); }
        
        .toggle-switch { position: relative; width: 50px; height: 26px; display: inline-block; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--border-color); transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #10b981; }
        input:checked + .slider:before { transform: translateX(24px); }
        
        .modern-select { padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--off-white); color: var(--text-main); outline: none; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-5px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes redPulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        .pulse-red { animation: redPulse 1.5s infinite; }
        
        @media (max-width: 768px) {
            .app-wrapper { flex-direction: column-reverse; }
            .sidebar-container { width: 100%; height: 50vh; flex-direction: column; }
            .main-sidebar { width: 100%; height: auto; flex-direction: row; padding: 10px; justify-content: space-around; overflow-x: auto; overflow-y: hidden; }
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
          <div className="brand"><h2>RTC</h2><span>ADMIN</span></div>
          <nav className="nav-menu">
            <button className={`nav-btn ${activePanel === 'fleet' ? 'active' : ''}`} onClick={() => setActivePanel('fleet')}>
              <i className="fa-solid fa-server"></i><span>Fleet</span>
            </button>
            <button className={`nav-btn ${activePanel === 'suggestions' ? 'active' : ''}`} onClick={() => setActivePanel('suggestions')}>
              <i className="fa-solid fa-lightbulb"></i><span>Suggestions</span>
            </button>
            <button className={`nav-btn ${activePanel === 'settings' ? 'active' : ''}`} onClick={() => setActivePanel('settings')}>
              <i className="fa-solid fa-cog"></i><span>Settings</span>
            </button>
            <button className="nav-btn" onClick={handleLogout}>
              <i className="fa-solid fa-sign-out-alt"></i><span>Logout</span>
            </button>
          </nav>
        </div>

        <div className="slide-panels">
          <div className={`panel-content ${activePanel === 'fleet' ? 'active' : ''}`}>
             <h2>Fleet Command</h2>
             <p className="panel-desc">Real-time overview of the entire transit network.</p>
             
             <div className="metric-card">
                 <div>
                    <h1>{totalBuses}</h1>
                    <p style={{color: 'var(--text-muted)'}}>Active Vehicles</p>
                 </div>
                 <i className="fa-solid fa-bus" style={{fontSize: '2rem', opacity: 0.2}}></i>
             </div>

             <div className="metric-card">
                 <div>
                    <h1>{onTimePercentage}%</h1>
                    <p style={{color: 'var(--text-muted)'}}>On-Time Perf</p>
                 </div>
                 <i className="fa-solid fa-check-circle" style={{fontSize: '2rem', opacity: 0.2}}></i>
             </div>

             <div className={`metric-card ${alertCount > 0 ? 'alert' : ''}`}>
                 <div>
                    <h1 style={{color: alertCount > 0 ? '#E31E24' : '#10b981'}}>{alertCount}</h1>
                    <p style={{color: alertCount > 0 ? '#E31E24' : 'var(--text-muted)'}}>Active Alerts</p>
                 </div>
                 <i className="fa-solid fa-triangle-exclamation" style={{fontSize: '2rem', opacity: 0.2}}></i>
             </div>

             <h3 style={{ marginTop: '20px', marginBottom: '10px', fontSize: '1.1rem' }}>Live Roster</h3>
             
             <div className="results-list">
               {Object.keys(activeBuses).length === 0 ? (
                 <p className="panel-desc" style={{textAlign: 'center', marginTop: '20px'}}>No vehicles currently on route.</p>
               ) : (
                  Object.entries(activeBuses).map(([bus, data]) => {
                    const isSignalLost = currentTime - data.lastUpdated > 60000;
                    const isAlert = data.alert === true;
                    const hasIssue = isSignalLost || isAlert;
                    
                    return (
                      <div key={bus} className="slide-card-item" style={{ borderLeft: `4px solid ${hasIssue ? 'var(--rtc-red)' : '#10b981'}` }}>
                         <div className="card-meta">
                             <h4>Route {data.routeId || 'Unknown'}</h4>
                             <p>Bus ID: {bus}</p>
                             <p style={{color: hasIssue ? 'var(--rtc-red)' : '#10b981', fontWeight: 'bold'}}>
                                {isAlert ? 'EMERGENCY / TRAFFIC' : (isSignalLost ? 'Signal Lost (Delayed)' : (data.status || 'Active'))}
                             </p>
                        </div>
                        <button 
                          onClick={() => handleDeleteBus(bus)} 
                          style={{background: 'rgba(227, 30, 36, 0.1)', color: 'var(--rtc-red)', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', transition: '0.2s'}}
                          title="Remove Bus"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                     </div>
                   );
                 })
               )}
             </div>
          </div>
          
          <div className={`panel-content ${activePanel === 'suggestions' ? 'active' : ''}`}>
             <h2>User Suggestions</h2>
             <p className="panel-desc">Feedback and suggestions submitted by users.</p>
             <div className="results-list" style={{ marginTop: '15px' }}>
               {Object.keys(suggestions).length === 0 ? (
                 <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No suggestions yet.</p>
               ) : (
                 Object.entries(suggestions)
                   .sort(([,a], [,b]) => b.timestamp - a.timestamp)
                   .map(([id, suggestion]) => (
                     <div key={id} style={{ padding: '15px', background: 'var(--clean-white)', borderRadius: '8px', marginBottom: '10px', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                       <p style={{ fontSize: '0.95rem', marginBottom: '8px', fontWeight: '500', color: 'var(--text-main)' }}>"{suggestion.text}"</p>
                       <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                         {new Date(suggestion.timestamp).toLocaleString()}
                       </p>
                     </div>
                   ))
               )}
             </div>
          </div>
          
          <div className={`panel-content ${activePanel === 'settings' ? 'active' : ''}`}>
             <h2>System Settings</h2>
             <p className="panel-desc">Configure dashboard preferences.</p>
             
             <div className="settings-row">
               <div>
                 <h4>Dark Mode</h4>
                 <p>Switch to a dark color scheme.</p>
               </div>
               <label className="toggle-switch">
                 <input type="checkbox" checked={isDarkMode} onChange={(e) => setIsDarkMode(e.target.checked)} />
                 <span className="slider"></span>
               </label>
             </div>
             
             <div className="settings-row">
               <div>
                 <h4>Telemetry Refresh</h4>
                 <p>Visual map polling interval.</p>
               </div>
               <select className="modern-select" value={refreshRate} onChange={(e) => setRefreshRate(e.target.value)}>
                 <option>Real-time</option>
                 <option>5 Seconds</option>
                 <option>10 Seconds</option>
               </select>
             </div>
             
          </div>
        </div>
      </aside>

      <main className="fullscreen-map">
        <MapContainer center={vizagCenter} zoom={13} style={{ width: '100%', height: '100%' }} zoomControl={true}>
          <TileLayer 
            url={isDarkMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"} 
            attribution="&copy; Google Maps"
          />
          {Object.entries(activeBuses).map(([bus, data]) => (
            <Marker key={bus} position={[data.lat, data.lng]} icon={data.alert ? emergencyBusIcon : adminBusIcon}>
              <Popup>
                <strong>Route {data.routeId}</strong><br/>
                Bus: {bus}<br/>
                Status: {data.alert ? 'EMERGENCY' : (currentTime - data.lastUpdated > 60000 ? 'Delayed' : 'Active')}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </main>
    </div>
  );
}