import { useState, useEffect } from "react";

export default function AuthPage({ requestedView, onLogin, onSignUp, onForgotPassword }) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('User');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (requestedView) setMode(requestedView);
  }, [requestedView]);

  const handleAction = (e) => {
    e.preventDefault();
    if (!email) {
      alert('Please fill in your email.');
      return;
    }

    if (mode === 'forgot') {
      onForgotPassword({ email, role });
      return;
    }

    if (!password) {
      alert('Please fill in your password.');
      return;
    }
    
    if (mode === 'login') {
      onLogin({ email, password, role });
    } else if (mode === 'signup') {
      onSignUp({ email, password, role });
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
      width: "100vw",
      padding: "20px",
      boxSizing: "border-box"
    }}>
      <style>{`
        .app-screen {
            flex: 1;
            padding: 20px; 
            display: flex;
            flex-direction: column;
            justify-content: center; 
            align-items: center;
            width: 100%;
            max-width: 420px;
            margin: auto;
        }

        .app-title {
            color: #0f172a;
            font-size: 28px;
            font-weight: 900;
            letter-spacing: 1.5px;
            margin-bottom: 25px;
        }

        .bus-card {
            background: transparent; 
            padding: 45px 20px 30px; 
            border: 6px solid #1e293b; 
            border-radius: 25px 25px 12px 12px; 
            width: 100%; 
            box-sizing: border-box;
            position: relative;
            margin-bottom: 20px; 
        }

        .bus-destination {
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

        .divider-line {
            width: 80%;
            height: 1.5px;
            background: linear-gradient(90deg, transparent, #64748b, transparent);
            margin: 0 auto 15px auto;
            opacity: 0.6;
        }

        .wheel {
            position: absolute;
            bottom: -24px; 
            width: 42px; 
            height: 22px; 
            background-color: #0f172a;
            border-radius: 6px;
        }
        .left-wheel { left: 20px; }
        .right-wheel { right: 20px; }

        .toggle-group, .role-group {
            display: flex;
            background: #f1f5f9;
            border-radius: 10px;
            margin-bottom: 15px;
            padding: 4px; 
            gap: 4px; 
        }

        .toggle-group button, .role-group button {
            flex: 1;
            padding: 8px;
            border: 2px solid transparent; 
            background: transparent;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            color: #64748b;
            border-radius: 8px;
            transition: all 0.2s ease-in-out;
        }

        .toggle-group button.active, .role-group button.active {
            border: 2px solid #3b82f6; 
            color: #3b82f6; 
            background: #ffffff; 
        }

        .instruction-text {
            text-align: center;
            font-size: 12px;
            color: #475569; 
            margin-bottom: 15px;
            font-weight: 600;
        }

        .input-group {
            position: relative;
            margin-bottom: 15px;
            width: 100%;
        }

        .input-custom {
            width: 100%;
            padding: 12px;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            box-sizing: border-box;
            font-size: 14px;
            background-color: #f8fafc;
            color: #0f172a;
        }
        .input-custom:focus {
            outline: none;
            border-color: #3b82f6;
            background-color: #ffffff;
        }
        
        .show-pass-btn {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #64748b;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
        }

        .main-btn {
            width: 100%;
            padding: 14px;
            background: #10b981; 
            color: white;
            border: none;
            border-radius: 10px;
            font-weight: bold;
            font-size: 15px;
            cursor: pointer;
            margin-top: 5px;
            transition: background 0.2s;
        }
        .main-btn:hover { background: #059669; }
        
        .bumper-area {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 15px; 
            margin-top: 25px;
        }

        .headlight {
            width: 18px;
            height: 18px;
            background-color: #fef08a; 
            border: 2px solid #1e293b; 
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(253, 224, 71, 0.7); 
        }

        .forgot-link {
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
        }
        .forgot-link:hover {
            background-color: #eab308;
        }
      `}</style>

          <div className="app-screen">
              <div className="app-title">RTC LIVE</div>

              <div className="bus-card">
                  
                  <div className="bus-destination">RTC VIZAG</div>
                  
                  <div className="wheel left-wheel"></div>
                  <div className="wheel right-wheel"></div>

                  <div className="divider-line"></div>

                  <div className="toggle-group">
                      <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
                      <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Sign Up</button>
                  </div>

                  <div className="role-group">
                      <button type="button" className={role === 'User' ? 'active' : ''} onClick={() => setRole('User')}>User</button>
                      <button type="button" className={role === 'Driver' ? 'active' : ''} onClick={() => setRole('Driver')}>Driver</button>
                      <button type="button" className={role === 'Admin' ? 'active' : ''} onClick={() => setRole('Admin')}>Admin</button>
                  </div>

                  <div className="instruction-text">
                      {mode === 'login' ? 'Enter email and password to login' : 
                       mode === 'signup' ? 'Enter email and create password to sign up' : 
                       'Enter email to receive a secure OTP'}
                  </div>

                  <form onSubmit={handleAction}>
                      <div className="input-group">
                          <input 
                              type="email" 
                              className="input-custom" 
                              placeholder="Email" 
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required 
                          />
                      </div>
                      
                      {mode !== 'forgot' && (
                          <div className="input-group">
                              <input 
                                  type={showPassword ? "text" : "password"} 
                                  className="input-custom" 
                                  placeholder={mode === 'login' ? 'Password' : 'Create Password'} 
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  required 
                                  style={{ paddingRight: '50px' }}
                              />
                              <button 
                                  type="button" 
                                  className="show-pass-btn" 
                                  onClick={() => setShowPassword(!showPassword)}
                              >
                                  {showPassword ? "HIDE" : "SHOW"}
                              </button>
                          </div>
                      )}
                      
                      <button type="submit" className="main-btn">
                          {mode === 'login' ? 'Login' : 
                           mode === 'signup' ? 'Create Account' : 
                           'Send Reset Link'}
                      </button>
                      
                      <div className="bumper-area">
                          <div className="headlight"></div>
                          {mode === 'login' && (
                              <a href="#" className="forgot-link" onClick={(e) => { e.preventDefault(); setMode('forgot'); }}>
                                  Forgot Password?
                              </a>
                          )}
                          {mode === 'forgot' && (
                              <a href="#" className="forgot-link" onClick={(e) => { e.preventDefault(); setMode('login'); }}>
                                  Back to Login
                              </a>
                          )}
                          <div className="headlight"></div>
                      </div>
                  </form>

              </div>
          </div>
    </div>
  );
}