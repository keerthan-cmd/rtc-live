import { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { database, ref, set, onValue } from "./firebase";
import MapComponent from "./MapComponent"; 
import AuthPage from "./AuthPage";
import OTPPage from "./OTPPage";
import emailjs from '@emailjs/browser';
import { get, child } from "firebase/database";

export default function App() {
  return (
    <Router>
      <div style={{ fontFamily: "sans-serif", color: "#333" }}>
        <Routes>
          <Route path="/" element={<AuthFlow />} />
          <Route path="/user" element={<UserView />} />
          <Route path="/driver" element={<DriverLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

// This new component handles the switch between Login -> OTP -> Main App
function AuthFlow() {
  const [step, setStep] = useState("login"); 
  const [authData, setAuthData] = useState({ email: "", role: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  // 🔴 PUT YOUR EMAILJS KEYS HERE 🔴
  const EMAILJS_SERVICE_ID = "service_057l2cf";
  const EMAILJS_TEMPLATE_ID = "template_1wigsc6";
  const EMAILJS_PUBLIC_KEY = "LIuoaP_pa9oJuofG9";

  // Helper to format emails for Firebase (Firebase keys can't have periods)
  const sanitizeEmail = (email) => email.replace(/\./g, ',');

  const handleNavigateToOTP = async (data) => {
    setIsProcessing(true);
    const safeEmail = sanitizeEmail(data.email);
    const dbRef = ref(database);

    try {
      // 1. VIP Check for Admins
      if (data.role === "Admin") {
        const adminCheck = await get(child(dbRef, `allowed_admins/${safeEmail}`));
        if (!adminCheck.exists()) {
          alert("Access Denied: This email is not registered as an Admin.");
          setIsProcessing(false);
          return;
        }
      }

      // 2. Generate a random 6-digit OTP
      const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

      // 3. Save it temporarily in Firebase
      await set(ref(database, `temporary_otps/${safeEmail}`), {
        code: generatedOTP,
        timestamp: Date.now()
      });

      // 4. Send the real email via EmailJS
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_email: data.email,
          otp_code: generatedOTP,
        },
        EMAILJS_PUBLIC_KEY
      );

      // 5. Move to the OTP screen
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
      // 1. Check Firebase to see if the OTP matches
      const otpSnapshot = await get(child(ref(database), `temporary_otps/${safeEmail}`));
      
      if (otpSnapshot.exists() && otpSnapshot.val().code === enteredCode) {
        
        // 2. Success! Delete the temporary OTP for security
        await set(ref(database, `temporary_otps/${safeEmail}`), null);

        // 3. Save the User/Driver to the database permanently
        if (authData.role !== "Admin") {
          await set(ref(database, `active_users/${authData.role}s/${safeEmail}`), {
            email: authData.email,
            lastLogin: Date.now(),
            status: "Active"
          });
        }

        // 4. Route them to their dashboard
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
    <OTPPage 
      email={authData.email} 
      role={authData.role} 
      onVerify={handleVerifyOTP} 
      onGoBack={() => setStep("login")} 
    />
  );
}

// ... (Keep the rest of your App.jsx below this) ...

// -------------------------------------------------------------
// EVERYTHING BELOW HERE IS YOUR EXISTING WORKING CODE
// -------------------------------------------------------------

function UserView() {
  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ paddingTop: '20px' }}>Passenger Map</h2>
      <Link to="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}>← Back to Login</Link>
      <MapComponent />
    </div>
  );
}

function DriverLogin() {
  const [busNumber, setBusNumber] = useState("");
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    let intervalId = null;

    if (isTracking && busNumber) {
      let currentLat = 17.7231;
      let currentLng = 83.3012;

      intervalId = setInterval(() => {
        currentLat += 0.0005; 
        currentLng += 0.0005; 

        set(ref(database, `buses/${busNumber}`), {
          lat: currentLat,
          lng: currentLng,
          lastUpdated: Date.now(),
          status: "Active"
        });
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTracking, busNumber]);

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h2>Driver Portal</h2>
      <input 
        type="text" 
        placeholder="Enter Bus Number (e.g. 38Y)" 
        value={busNumber}
        onChange={(e) => setBusNumber(e.target.value)}
        disabled={isTracking}
        style={{ padding: '10px', marginBottom: '20px', fontSize: '16px', width: '200px' }} 
      />
      <br />
      <button 
        onClick={() => setIsTracking(!isTracking)}
        disabled={!busNumber}
        style={{ padding: '10px 20px', backgroundColor: isTracking ? '#dc2626' : '#16a34a', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer' }}
      >
        {isTracking ? "Stop Simulating Route" : "Start Simulating Route"}
      </button>
      <br /><br />
      <Link to="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}>← Back to Login</Link>
    </div>
  );
}

function AdminDashboard() {
  const [activeBuses, setActiveBuses] = useState({});

  useEffect(() => {
    const busesRef = ref(database, 'buses');
    const unsubscribe = onValue(busesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setActiveBuses(data);
      } else {
        setActiveBuses({});
      }
    });

    return () => unsubscribe(); 
  }, []);

  const busCount = Object.keys(activeBuses).length;

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h2>Admin Dashboard</h2>
      <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '10px', display: 'inline-block', marginBottom: '20px' }}>
        <h1 style={{ margin: '0', color: '#4ade80' }}>{busCount}</h1>
        <p style={{ margin: '0', color: 'white' }}>Active Buses</p>
      </div>
      <br />
      {Object.keys(activeBuses).map(busNumber => (
        <div key={busNumber} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px auto', width: '200px', borderRadius: '5px' }}>
          🚌 Bus <b>{busNumber}</b>
        </div>
      ))}
      <br /><br />
      <Link to="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}>← Back to Login</Link>
    </div>
  );
}