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
    if (!email) return alert('Please fill in your email.');
    
    if (mode === 'forgot') {
      onForgotPassword({ email, role });
      return;
    }

    if (!password) return alert('Please fill in your password.');
    
    if (mode === 'login') onLogin({ email, password, role });
    else if (mode === 'signup') onSignUp({ email, password, role });
  };

  return (
    <div style={{
      width: '100vw', height: '100dvh', overflow: 'hidden',
      backgroundImage: 'url(/login_bg.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif", color: 'white', position: 'relative'
    }}>
      {/* Dark overlay to ensure readability */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1 }}></div>

      <style>{`
        .glass-auth-card { 
          background: rgba(15, 23, 42, 0.45); 
          backdrop-filter: blur(24px); 
          -webkit-backdrop-filter: blur(24px); 
          border: 1px solid rgba(255, 255, 255, 0.15); 
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1); 
          border-radius: 32px; 
          padding: 48px 40px; 
          width: 100%; 
          max-width: 440px; 
          z-index: 10; 
          transform: translateY(0);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .glass-auth-card:hover { box-shadow: 0 40px 80px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.15); transform: translateY(-4px); }
        .ultra-input { 
          width: 100%; 
          background: rgba(255,255,255,0.05); 
          border: 1px solid rgba(255,255,255,0.1); 
          border-radius: 16px; 
          padding: 18px 20px; 
          color: white; 
          outline: none; 
          transition: all 0.3s; 
          font-size: 15px; 
          margin-bottom: 20px; 
          box-sizing: border-box; 
          font-weight: 500;
        }
        .ultra-input::placeholder { color: rgba(255,255,255,0.4); }
        .ultra-input:focus { 
          border-color: rgba(255,255,255,0.5); 
          background: rgba(255,255,255,0.1); 
          box-shadow: 0 0 0 4px rgba(255,255,255,0.05); 
        }
        .neon-btn { 
          width: 100%; 
          background: #ffffff; 
          color: #0f172a; 
          border: none; 
          border-radius: 16px; 
          padding: 18px; 
          font-weight: 800; 
          font-size: 16px; 
          cursor: pointer; 
          transition: all 0.3s; 
          margin-top: 12px;
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        .neon-btn:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 15px 30px rgba(255,255,255,0.2); 
          background: #f8fafc;
        }
        .auth-tab { 
          flex: 1; 
          background: transparent; 
          border: none; 
          color: rgba(255,255,255,0.4); 
          font-weight: 700; 
          padding: 12px; 
          cursor: pointer; 
          transition: all 0.3s; 
          font-size: 16px;
          position: relative;
        }
        .auth-tab.active { color: white; }
        .auth-tab.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 3px;
          background: white;
          border-radius: 3px;
        }
        .role-selector {
          display: flex;
          background: rgba(0,0,0,0.2);
          border-radius: 20px;
          padding: 4px;
          margin-bottom: 30px;
        }
        .role-chip { 
          flex: 1;
          text-align: center;
          padding: 8px 0; 
          border-radius: 16px; 
          font-size: 13px; 
          font-weight: 700; 
          cursor: pointer; 
          transition: all 0.3s; 
          color: rgba(255,255,255,0.5); 
        }
        .role-chip.active { 
          background: rgba(255,255,255,0.15); 
          color: white; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        .eye-toggle { 
          position: absolute; 
          right: 20px; 
          top: 18px; 
          background: none; 
          border: none; 
          color: rgba(255,255,255,0.4); 
          cursor: pointer; 
          font-size: 18px; 
          transition: color 0.2s; 
          padding: 0; 
        }
        .eye-toggle:hover { color: white; }
      `}</style>

      <div className="glass-auth-card">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '36px', fontWeight: '900', letterSpacing: '-1px', color: 'white' }}>
            RTC LIVE
          </div>
          <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', marginTop: '8px', fontWeight: '500' }}>
            The city moves with you
          </div>
        </div>

        <div style={{ display: 'flex', marginBottom: '32px' }}>
          <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Login</button>
          <button className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => setMode('signup')}>Sign Up</button>
        </div>

        <div className="role-selector">
          {['User', 'Driver', 'Admin'].map(r => (
            <div key={r} className={`role-chip ${role === r ? 'active' : ''}`} onClick={() => setRole(r)}>{r}</div>
          ))}
        </div>

        <form onSubmit={handleAction}>
          <input 
            type="email" 
            className="ultra-input" 
            placeholder="Email Address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          
          {mode !== 'forgot' && (
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                className="ultra-input" 
                placeholder={mode === 'login' ? 'Password' : 'Create Password'} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: '50px' }}
              />
              <button 
                type="button" 
                className="eye-toggle" 
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          )}

          <button type="submit" className="neon-btn">
            {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          {mode === 'login' && (
            <a href="#" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s', fontWeight: '500' }} onClick={(e) => { e.preventDefault(); setMode('forgot'); }}>
              Forgot your password?
            </a>
          )}
          {mode === 'forgot' && (
            <a href="#" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s', fontWeight: '500' }} onClick={(e) => { e.preventDefault(); setMode('login'); }}>
              Back to Login
            </a>
          )}
        </div>
      </div>
    </div>
  );
}