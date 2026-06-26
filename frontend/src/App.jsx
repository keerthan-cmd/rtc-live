import { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import emailjs from '@emailjs/browser';
import { database } from "./firebase"; 
import { ref, set, onValue, get, child } from "firebase/database";
import MapComponent from "./MapComponent"; 
import AuthPage from "./AuthPage";
import OTPPage from "./OTPPage";

export default function App() {
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
  const [step, setStep] = useState("login"); 
  const [authData, setAuthData] = useState({ email: "", role: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  // 🔴 YOUR EMAILJS KEYS 🔴
  const EMAILJS_SERVICE_ID = "service_057l2cf";
  const EMAILJS_TEMPLATE_ID = "template_1wigsc6";
  const EMAILJS_PUBLIC_KEY = "LIuoaP_pa9oJuofG9";

  // AUTO-LOGIN: Check if they already have a saved session when the app opens
  useEffect(() => {
    const savedSession = localStorage.getItem("rtc_session");
    if (savedSession) {
      const userData = JSON.parse(savedSession);
      if (userData.role === "User") navigate("/user");
      if (userData.role === "Driver") navigate("/driver");
      if (userData.role === "Admin") navigate("/admin");
    }
  }, [navigate]);

  const sanitizeEmail = (email) => email.replace(/\./g, ',');

  const handleNavigateToOTP = async (data) => {
    setIsProcessing(true);
    const safeEmail = sanitizeEmail(data.email);
    const dbRef = ref(database);

    try {
      if (data.role === "Admin") {
        const adminCheck = await get(child(dbRef, `allowed_admins/${safeEmail}`));
        if (!adminCheck.exists()) {
          alert("Access Denied: This email is not registered as an Admin.");
          setIsProcessing(false);
          return;
        }
      }

      const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

      await set(ref(database, `temporary_otps/${safeEmail}`), {
        code: generatedOTP,
        timestamp: Date.now()
      });

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        { to_email: data.email, otp_code: generatedOTP },
        EMAILJS_PUBLIC_KEY
      );

      setAuthData(data);
      setStep("otp");
      
    } catch (error) {
      console.error("Error sending OTP:", error);
      alert("Failed to send email. Please try again.");
    }
    setIsProcessing(false);
  };

  const handleVerifyOTP = async (enteredCode) => {
    const safeEmail = sanitizeEmail(authData.email);
    
    try {
      const otpSnapshot = await get(child(ref(database), `temporary_otps/${safeEmail}`));
      
      if (otpSnapshot.exists() && otpSnapshot.val().code === enteredCode) {
        
        await set(ref(database, `temporary_otps/${safeEmail}`), null);

        if (authData.role !== "Admin") {
          await set(ref(database, `active_users/${authData.role}s/${safeEmail}`), {
            email: authData.email,
            lastLogin: Date.now(),
            status: "Active"
          });
        }

        // SAVE SESSION: Drop the digital ID card into their browser
        localStorage.setItem("rtc_session", JSON.stringify({
          email: authData.email,
          role: authData.role,
          timestamp: Date.now()
        }));

        if (authData.role === "User") navigate("/user");
        if (authData.role === "Driver") navigate("/driver");
        if (authData.role === "Admin") navigate("/admin");
        
      } else {
        alert("Invalid OTP code. Please try again.");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
    }
  };

  if (step === "login") {
    return (
      <div style={{ pointerEvents: isProcessing ? 'none' : 'auto', opacity: isProcessing ? 0.7 : 1 }}>
        <AuthPage onNavigateToOTP={handleNavigateToOTP} />
        {isProcessing && <p style={{textAlign: 'center', fontWeight: 'bold'}}>Sending secure code...</p>}
      </div>
    );
  }

  return (
    <OTPPage email={authData.email} role={authData.role} onVerify={handleVerifyOTP} onGoBack={() => setStep("login")} />
  );
}

// -------------------------------------------------------------
// UTILITARIAN DASHBOARDS (WITH REAL GPS)
// -------------------------------------------------------------

function UserView() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("rtc_session");
    navigate("/");
  };

  return (
    <div>
      <div style={{ padding: '15px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: '#0f172a' }}>Live Transit Map</h2>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>Log Out</button>
      </div>
      <MapComponent />
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
      if (!navigator.geolocation) {
        alert("GPS tracking is not supported by this phone's browser.");
        setIsTracking(false);
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const currentLat = position.coords.latitude;
          const currentLng = position.coords.longitude;
          
          set(ref(database, `buses/${busNumber}`), {
            lat: currentLat, 
            lng: currentLng, 
            lastUpdated: Date.now(), 
            status: "Active"
          });
        },
        (error) => {
          console.error("GPS Error:", error);
          alert("Error: Please ensure Location Services are turned ON and allow permissions.");
          setIsTracking(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000
        }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isTracking, busNumber]);

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>Driver Terminal</h2>
        
        <input 
          type="text" 
          placeholder="Bus Route (e.g. 38Y)" 
          value={busNumber}
          onChange={(e) => setBusNumber(e.target.value.toUpperCase())}
          disabled={isTracking}
          style={{ padding: '15px', marginBottom: '20px', fontSize: '18px', width: '100%', borderRadius: '8px', border: '2px solid #e2e8f0', boxSizing: 'border-box' }} 
        />
        
        <button 
          onClick={() => setIsTracking(!isTracking)}
          disabled={!busNumber}
          style={{ width: '100%', padding: '15px', backgroundColor: isTracking ? '#ef4444' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
        >
          {isTracking ? "End Route Broadcast" : "Start Live Broadcast"}
        </button>
        
        {isTracking && (
          <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#ecfdf5', color: '#047857', borderRadius: '8px', fontWeight: 'bold' }}>
            ● Broadcasting live GPS location
          </div>
        )}
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
    const unsubscribe = onValue(ref(database, 'buses'), (snapshot) => {
      setActiveBuses(snapshot.val() || {});
    });
    return () => unsubscribe(); 
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: '#0f172a' }}>System Overview</h2>
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
              <div key={bus} style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '8px', fontWeight: 'bold', color: '#334155' }}>
                🚌 Route {bus}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}