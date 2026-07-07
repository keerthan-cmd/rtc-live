import { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import emailjs from '@emailjs/browser';
import { database } from "./firebase"; 
import { ref, set, onValue, get, child } from "firebase/database";
import MapComponent from "./MapComponent"; 
import AuthPage from "./AuthPage";
import OTPPage from "./OTPPage";
import AIChatWidget from "./AIChatWidget";
import appLogo from "./logo.png";
import UserDashboard from "./UserDashboard";

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

  const EMAILJS_SERVICE_ID = "service_057l2cf";
  const EMAILJS_TEMPLATE_ID = "template_1wigsc6";
  const EMAILJS_PUBLIC_KEY = "LIuoaP_pa9oJuofG9";

  useEffect(() => {
    const savedSession = localStorage.getItem("rtc_session");
    if (savedSession) {
      const userData = JSON.parse(savedSession);
      navigate(`/${userData.role.toLowerCase()}`);
    }
  }, [navigate]);

  const sanitizeEmail = (email) => email.replace(/\./g, ',');

  const handleLogin = async (data) => {
    if (!data.email || !data.password) return alert("Please provide email and password.");
    setIsProcessing(true);
    const safeEmail = sanitizeEmail(data.email);
    
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
    } catch (error) {
      alert("System error during login.");
    }
    setIsProcessing(false);
  };

  const handleSignUp = async (data) => {
    if (!data.email || !data.password) return alert("Please fill out all fields.");
    setIsProcessing(true);
    const safeEmail = sanitizeEmail(data.email);
    
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
    } catch (error) {
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
      
      console.log(`%c 🚨 DEV OVERRIDE - YOUR OTP IS: ${generatedOTP}`, 'color: #10b981; font-size: 16px; font-weight: bold;');

      // 3. Try to email the user, but don't break if EmailJS blocks it
      try {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { to_email: data.email, otp_code: generatedOTP }, EMAILJS_PUBLIC_KEY);
      } catch (emailError) {
        console.warn("Email limits reached. OTP provided in console instead.");
        alert("Email server limit reached! Press F12 to open your browser Developer Console and find your 6-digit OTP code.");
      }

      setAuthData({ email: data.email, role: data.role });
      setStep("otp");

    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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

function DriverDashboard() {
  const [busNumber, setBusNumber] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [passengers, setPassengers] = useState(12);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("rtc_session");
    navigate("/");
  };

  useEffect(() => {
    let watchId = null;
    if (isTracking && busNumber) {
      if (!navigator.geolocation) { alert("GPS tracking not supported."); setIsTracking(false); return; }
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          set(ref(database, `buses/${busNumber}`), { lat: position.coords.latitude, lng: position.coords.longitude, lastUpdated: Date.now(), status: "On Route" });
        },
        (error) => { console.error(error); alert("Location error."); setIsTracking(false); },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    } else if (!isTracking && busNumber) {
        set(ref(database, `buses/${busNumber}`), null); // Remove bus from map when offline
    }
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, [isTracking, busNumber]);

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: 'white', padding: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
         <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '1px' }}>RTC <span style={{ color: '#10b981' }}>DRIVER</span></div>
         <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>Sign Out</button>
      </div>

      <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '1px solid #334155' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
             <h2 style={{ margin: 0, fontSize: '32px', fontWeight: '800' }}>{isTracking ? 'Online' : 'Offline'}</h2>
             <p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>{isTracking ? 'Broadcasting live location' : 'Enter route to start'}</p>
          </div>

          <input 
            type="text" 
            placeholder="Route (e.g. 38Y)" 
            value={busNumber} 
            onChange={(e) => setBusNumber(e.target.value.toUpperCase())} 
            disabled={isTracking} 
            style={{ padding: '18px', marginBottom: '20px', fontSize: '20px', width: '100%', borderRadius: '12px', border: '2px solid #334155', backgroundColor: '#0f172a', color: 'white', boxSizing: 'border-box', textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase' }} 
          />
          
          <button 
            onClick={() => setIsTracking(!isTracking)} 
            disabled={!busNumber} 
            style={{ width: '100%', padding: '20px', backgroundColor: isTracking ? '#ef4444' : '#10b981', color: 'white', border: 'none', borderRadius: '16px', fontSize: '20px', fontWeight: '900', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: isTracking ? '0 10px 25px rgba(239, 68, 68, 0.4)' : '0 10px 25px rgba(16, 185, 129, 0.4)' }}
          >
            {isTracking ? "Go Offline" : "Go Online"}
          </button>
        </div>

        {isTracking && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
             <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '20px', textAlign: 'center', border: '1px solid #334155' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Next Stop</div>
                <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '5px', color: '#3b82f6' }}>RTC Complex</div>
             </div>
             <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '20px', textAlign: 'center', border: '1px solid #334155' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Est. Load</div>
                <div style={{ fontSize: '24px', fontWeight: '900', marginTop: '5px' }}>{passengers}</div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [activeBuses, setActiveBuses] = useState({});
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("rtc_session");
    navigate("/");
  };

  useEffect(() => {
    const unsubscribe = onValue(ref(database, 'buses'), (snapshot) => { setActiveBuses(snapshot.val() || {}); });
    return () => unsubscribe(); 
  }, []);

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ backgroundColor: '#ffffff', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: '#10b981', color: 'white', padding: '10px', borderRadius: '12px', fontWeight: '900', fontSize: '20px' }}>RTC</div>
          <h2 style={{ color: '#0f172a', margin: 0, fontSize: '20px', fontWeight: '800' }}>Fleet Command</h2>
        </div>
        <button onClick={handleLogout} style={{ background: '#f1f5f9', border: 'none', color: '#ef4444', fontWeight: 'bold', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}>Log Out</button>
      </div>

      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '40px' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '20px', color: 'white', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden' }}>
            <h1 style={{ fontSize: '56px', margin: '0', color: '#10b981', lineHeight: '1' }}>{Object.keys(activeBuses).length}</h1>
            <p style={{ margin: '10px 0 0 0', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Vehicles</p>
            <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', fontSize: '100px', opacity: '0.1' }}>🚌</div>
          </div>
          
          <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <h1 style={{ fontSize: '40px', margin: '0', color: '#0f172a', lineHeight: '1' }}>98.2%</h1>
            <p style={{ margin: '10px 0 0 0', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>On-Time Performance</p>
          </div>
          
          <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
             <h1 style={{ fontSize: '40px', margin: '0', color: '#ef4444', lineHeight: '1' }}>0</h1>
             <p style={{ margin: '10px 0 0 0', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Alerts</p>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
             <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Live Roster</h3>
             <span style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>Auto-updating</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.keys(activeBuses).length === 0 ? (
               <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                 <div style={{ fontSize: '40px', marginBottom: '10px' }}>😴</div>
                 No vehicles currently on route.
               </div>
            ) : null}
            {Object.entries(activeBuses).map(([bus, data]) => (
              <div key={bus} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{bus.substring(0,2)}</div>
                    <div>
                       <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '16px' }}>Route {bus}</div>
                       <div style={{ fontSize: '12px', color: '#64748b' }}>Lat: {data.lat.toFixed(4)}, Lng: {data.lng.toFixed(4)}</div>
                    </div>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
                    <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '14px' }}>{data.status || 'Active'}</span>
                 </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}