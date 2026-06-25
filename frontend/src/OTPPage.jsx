import { useState, useEffect, useRef } from "react";

export default function OTPPage({ email, role, onVerify, onGoBack }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(55);
  const inputRefs = useRef([]);

  // Handle the countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft]);

  // Handle typing in the boxes
  const handleChange = (index, value) => {
    // Only allow numbers
    const cleanValue = value.replace(/[^0-9]/g, '');
    if (!cleanValue && value !== "") return;

    const newOtp = [...otp];
    newOtp[index] = cleanValue;
    setOtp(newOtp);

    // Auto-focus next input
    if (cleanValue && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Handle backspace to go to the previous box
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const submitOTP = () => {
    const fullOtp = otp.join("");
    if (fullOtp.length === 6) {
      onVerify(fullOtp); // Send the OTP back to the main app
    } else {
      alert("Please enter the full 6-digit OTP code.");
    }
  };

  return (
    <div className="app-screen">
      <div className="app-title">RTC LIVE</div>

      <div className="card">
        <div className="bus-destination">RTC VIZAG</div>
        
        <div className="wheel left-wheel"></div>
        <div className="wheel right-wheel"></div>
        <div className="divider-line"></div>

        <div className="center-wrap">
          <div className="verify-header">
            <h2>Verify</h2>
            <p>Enter the code sent to {email || "your email"}</p>
          </div>

          <div className="otp-container">
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                maxLength="1"
                className="otp-box"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                ref={(el) => (inputRefs.current[index] = el)}
                autoFocus={index === 0}
              />
            ))}
          </div>
        </div>

        <button type="button" className="main-btn" onClick={submitOTP}>
          Verify and login
        </button>
        
        <div className="bumper-area">
          <div className="headlight"></div>
          <button 
            type="button" 
            className="forgot-link" 
            onClick={onGoBack}
            style={{ cursor: 'pointer', background: 'transparent', border: '2px solid #1e293b' }}
          >
            Wrong email?
          </button>
          <div className="headlight"></div>
        </div>

        <div className="resend-timer">
          {timeLeft > 0 ? (
            <span>Resend OTP in <span style={{fontWeight: 'bold', color: '#0f172a'}}>{timeLeft}</span>s</span>
          ) : (
            <a href="#" style={{ color: "#10b981", textDecoration: "none", fontWeight: "bold" }}>
              Resend OTP
            </a>
          )}
        </div>
      </div>
    </div>
  );
}