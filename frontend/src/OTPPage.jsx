import { useState, useEffect, useRef } from "react";

export default function OTPPage({ email, role, onVerify, onGoBack }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(55);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft]);

  const handleChange = (index, value) => {
    const cleanValue = value.replace(/[^0-9]/g, '');
    if (!cleanValue && value !== "") return;

    const newOtp = [...otp];
    newOtp[index] = cleanValue;
    setOtp(newOtp);

    if (cleanValue && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const submitOTP = () => {
    const fullOtp = otp.join("");
    if (fullOtp.length === 6) {
      onVerify(fullOtp);
    } else {
      alert("Please enter the full 6-digit OTP code.");
    }
  };

  return (
    <div style={{
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      backgroundColor: "#cbd5e1", 
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      margin: 0,
      width: "100vw"
    }}>
      <style>{`
        .phone-frame {
            width: 100%;
            max-width: 480px;
            min-height: 100vh;
            background-color: transparent; 
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .app-screen-custom {
            width: 100%;
            padding: 20px; 
            display: flex;
            flex-direction: column;
            justify-content: center; 
            align-items: center;
        }

        .app-title-custom {
            color: #0f172a;
            font-size: 28px;
            font-weight: 900;
            letter-spacing: 1.5px;
            margin-bottom: 25px;
            text-align: center;
        }

        .bus-card {
            background: transparent; 
            padding: 45px 20px 30px; 
            border: 6px solid #1e293b; 
            border-radius: 25px 25px 12px 12px; 
            width: 100%; 
            height: 445px; 
            box-sizing: border-box;
            position: relative;
            margin-bottom: 20px; 
        }

        .bus-destination-led {
            position: absolute;
            top: 12px;
            left: 50%;
            transform: translateX(-50%);
            background: #111827;
            color: #fde047; 
            font-size: 10px;
            font-weight: 800;
            padding: 4px 16px;
            border-radius: 6px;
            letter-spacing: 1.5px;
            border: 2px solid #334155; 
        }

        .divider-line-custom {
            width: 80%;
            height: 1.5px;
            background: linear-gradient(90deg, transparent, #64748b, transparent);
            margin: 0 auto 0 auto;
            opacity: 0.6;
        }

        .wheel-custom {
            position: absolute;
            bottom: -24px; 
            width: 42px; 
            height: 22px; 
            background-color: #0f172a;
            border-radius: 6px;
        }
        .left-wheel-custom { left: 20px; }
        .right-wheel-custom { right: 20px; }

        .center-wrap {
            position: absolute;
            top: 60px; 
            bottom: 140px; 
            left: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }

        .verify-header {
            text-align: center;
            margin-bottom: 25px;
            width: 100%;
        }
        
        .verify-header h2 {
            color: #0f172a;
            font-size: 22px;
            margin: 0 0 8px 0;
        }

        .verify-header p {
            color: #64748b;
            font-size: 13px;
            margin: 0;
            font-weight: 500;
        }

        .otp-container {
            display: flex;
            justify-content: space-between;
            gap: 6px;
            width: 100%;
        }

        .otp-box {
            width: 38px;
            height: 48px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            background-color: #f8fafc;
            transition: all 0.2s;
            box-sizing: border-box;
        }

        .otp-box:focus {
            outline: none;
            border-color: #3b82f6;
            background-color: #ffffff;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .main-btn-custom {
            position: absolute;
            bottom: 85px; 
            left: 20px;
            width: calc(100% - 40px); 
            padding: 14px;
            background: #10b981; 
            color: white;
            border: none;
            border-radius: 10px;
            font-weight: bold;
            font-size: 15px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .main-btn-custom:hover { background: #059669; }

        .bumper-area-custom {
            position: absolute;
            bottom: 35px; 
            left: 0;
            right: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 15px; 
        }

        .headlight-custom {
            width: 18px;
            height: 18px;
            background-color: #fef08a; 
            border: 2px solid #1e293b; 
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(253, 224, 71, 0.7); 
        }

        .forgot-link-custom {
            background-color: #facc15; 
            color: #000000; 
            text-decoration: none;
            font-size: 12px; 
            font-weight: 900;
            padding: 6px 14px; 
            border-radius: 4px;
            border: 2px solid #1e293b; 
            letter-spacing: 0.5px;
            text-transform: uppercase;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: background 0.2s;
            white-space: nowrap;
            cursor: pointer;
        }
        .forgot-link-custom:hover {
            background-color: #eab308;
        }

        .resend-timer {
            position: absolute;
            bottom: 10px; 
            left: 0;
            right: 0;
            text-align: center;
            font-size: 11px;
            color: #64748b;
            font-weight: 600;
            margin: 0;
        }
      `}</style>

      <div className="phone-frame">
          <div className="app-screen-custom">
              <div className="app-title-custom">RTC LIVE</div>

              <div className="bus-card">
                  
                  <div className="bus-destination-led">RTC VIZAG</div>
                  
                  <div className="wheel-custom left-wheel-custom"></div>
                  <div className="wheel-custom right-wheel-custom"></div>

                  <div className="divider-line-custom"></div>

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

                  <button type="button" className="main-btn-custom" onClick={submitOTP}>Verify and login</button>
                  
                  <div className="bumper-area-custom">
                      <div className="headlight-custom"></div>
                      <button className="forgot-link-custom" onClick={onGoBack}>Wrong email? Go back</button>
                      <div className="headlight-custom"></div>
                  </div>

                  <div className="resend-timer" id="timerText">
                      {timeLeft > 0 ? (
                        <span>Resend OTP in <span id="countdown" style={{fontWeight: 'bold', color: '#0f172a'}}>{timeLeft}</span>s</span>
                      ) : (
                        <a href="#" style={{ color: "#10b981", textDecoration: "none", fontWeight: "bold" }}>
                          Resend OTP
                        </a>
                      )}
                  </div>

              </div>

          </div>
      </div>
    </div>
  );
}