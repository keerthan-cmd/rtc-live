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
  const handleLogout = () => {
    localStorage.removeItem("rtc_session");
    navigate("/");
  };
  return (
    <div>
      <div style={{ padding: '15px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={appLogo} alt="RTC Logo" style={{ height: '32px' }} />
          <h2 style={{ margin: 0, color: '#0f172a' }}>Live Transit Map</h2>
        </div>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>Log Out</button>
      </div>
      <MapComponent />
      <AIChatWidget />
    </div>
  );
}

function DriverDashboard() {
  const [busNumber, setBusNumber] = useState("");
  const [isTracking, setIsTracking] = useState(false);
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
          set(ref(database, `buses/${busNumber}`), { lat: position.coords.latitude, lng: position.coords.longitude, lastUpdated: Date.now(), status: "Active" });
        },
        (error) => { console.error(error); alert("Location error."); setIsTracking(false); },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, [isTracking, busNumber]);

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <img src={appLogo} alt="RTC Logo" style={{ height: '60px' }} />
      </div>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>Driver Terminal</h2>
        <input type="text" placeholder="Bus Route (e.g. 38Y)" value={busNumber} onChange={(e) => setBusNumber(e.target.value.toUpperCase())} disabled={isTracking} style={{ padding: '15px', marginBottom: '20px', fontSize: '18px', width: '100%', borderRadius: '8px', border: '2px solid #e2e8f0', boxSizing: 'border-box' }} />
        <button onClick={() => setIsTracking(!isTracking)} disabled={!busNumber} style={{ width: '100%', padding: '15px', backgroundColor: isTracking ? '#ef4444' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
          {isTracking ? "End Route Broadcast" : "Start Live Broadcast"}
        </button>
        {isTracking && <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#ecfdf5', color: '#047857', borderRadius: '8px', fontWeight: 'bold' }}>● Broadcasting live GPS location</div>}
      </div>
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>Log Out</button>
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
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={appLogo} alt="RTC Logo" style={{ height: '40px' }} />
          <h2 style={{ color: '#0f172a', margin: 0 }}>System Overview</h2>
        </div>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>Log Out</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '15px', color: 'white', textAlign: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '48px', margin: '0', color: '#10b981' }}>{Object.keys(activeBuses).length}</h1>
          <p style={{ margin: '10px 0 0 0', fontWeight: '600' }}>Active Vehicles</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 15px 0', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>Live Roster</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {Object.keys(activeBuses).length === 0 ? <p style={{ color: '#94a3b8' }}>No active buses.</p> : null}
            {Object.keys(activeBuses).map(bus => (
              <div key={bus} style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '8px', fontWeight: 'bold', color: '#334155' }}>🚌 Route {bus}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}