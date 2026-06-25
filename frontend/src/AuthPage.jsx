import { useState } from "react";

export default function AuthPage({ onNavigateToOTP }) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('User');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAction = (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Please fill in all fields.');
      return;
    }
    
    // Pass the email and role over to the OTP screen
    onNavigateToOTP({ email, role, mode });
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
            className={mode === 'login' ? 'active' : ''} 
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button 
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
              className={role === r ? 'active' : ''} 
              onClick={() => setRole(r)}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="instruction-text">
          {mode === 'login' ? 'Enter email and password to login' : 'Enter email and create password to sign up'}
        </div>

        <form onSubmit={handleAction}>
          <input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
          <input 
            type="password" 
            placeholder={mode === 'login' ? 'Password' : 'Create Password'} 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
          
          <button type="submit" className="main-btn">
            {mode === 'login' ? 'Send OTP' : 'Create Account'}
          </button>
          
          <div className="bumper-area">
            <div className="headlight"></div>
            {mode === 'login' && (
              <a href="#" className="forgot-link">Forgot Password?</a>
            )}
            <div className="headlight"></div>
          </div>
        </form>
      </div>
    </div>
  );
}