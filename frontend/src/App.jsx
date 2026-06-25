import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { database, ref, set, onValue } from "./firebase";
import MapComponent from "./MapComponent"; 
import AuthPage from "./AuthPage";
import OTPPage from "./OTPPage";

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
  const [step, setStep] = useState("login"); // 'login' or 'otp'
  const [authData, setAuthData] = useState({ email: "", role: "", mode: "" });
  const navigate = useNavigate();

  const handleNavigateToOTP = (data) => {
    setAuthData(data);
    setStep("otp");
  };

  const handleVerifyOTP = (otpCode) => {
    // In Phase 2, this is where we actually check Firebase to see if the OTP is right.
    // For now, we simulate a successful login!
    console.log(`Verified OTP ${otpCode} for ${authData.email} as ${authData.role}`);
    
    // Route them to the correct app based on their role
    if (authData.role === "User") navigate("/user");
    if (authData.role === "Driver") navigate("/driver");
    if (authData.role === "Admin") navigate("/admin");
  };

  if (step === "login") {
    return <AuthPage onNavigateToOTP={handleNavigateToOTP} />;
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