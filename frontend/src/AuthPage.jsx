import { useState, useEffect } from "react";

export default function AuthPage({ requestedView, onLogin, onSignUp, onForgotPassword }) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('User');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Listens to the main App.jsx if it needs to force-switch the view
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
    
    // Pass the correct data to the App.jsx functions
    if (mode === 'login') {
      onLogin({ email, password, role });
    } else if (mode === 'signup') {
      onSignUp({ email, password, role });
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

        <div className="toggle-group">
          <button 
            type="button"
            className={mode === 'login' ? 'active' : ''} 
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button 
            type="button"
            className={mode === 'signup' ? 'active' : ''} 
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
        </div>

        <div className="role-group">
          {['User', 'Driver', 'Admin'].map((r) => (
            <button 
              key={r}
              type="button"
              className={role === r ? 'active' : ''} 
              onClick={() => setRole(r)}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="instruction-text">
          {mode === 'login' ? 'Enter email and password to login' : 
           mode === 'signup' ? 'Enter email and create password to sign up' : 
           'Enter email to receive a secure OTP'}
        </div>

        <form onSubmit={handleAction}>
          <input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
          
          {mode !== 'forgot' && (
            <input 
              type="password" 
              placeholder={mode === 'login' ? 'Password' : 'Create Password'} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          )}
          
          <button type="submit" className="main-btn">
            {mode === 'login' ? 'Login' : 
             mode === 'signup' ? 'Create Account' : 
             'Send OTP'}
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
  );
}