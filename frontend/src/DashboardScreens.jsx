import React, { useState, useEffect } from 'react';

export function MyRoutes({ onBack }) {
  const [routes, setRoutes] = useState([
    { id: 1, name: "Home to Work", from: "Gajuwaka", to: "RTC Complex", route: "38Y" },
    { id: 2, name: "Weekend Mall", from: "NAD", to: "Maddilapalem", route: "400K" }
  ]);

  const handleAddRoute = () => {
    const newRoute = { id: Date.now(), name: "Custom Route", from: "Current Loc", to: "Scindia", route: "28Z" };
    setRoutes([...routes, newRoute]);
  };

  const handleDelete = (id) => {
    setRoutes(routes.filter(r => r.id !== id));
  };

  return (
    <div className="container slide-up">
      <div className="screen-header">
        <i className="fas fa-arrow-left" onClick={onBack}></i>
        <h2>My Saved Routes</h2>
      </div>
      <div className="card-list">
        {routes.length === 0 ? <p className="text-muted text-center mt-6">No saved routes yet.</p> : null}
        {routes.map(r => (
          <div key={r.id} className="premium-card route-card">
            <div className="card-icon"><i className="fas fa-heart text-danger"></i></div>
            <div className="card-content">
              <h3>{r.name}</h3>
              <p className="route-path">
                {r.from} <i className="fas fa-arrow-right"></i> {r.to}
              </p>
              <span className="badge">Route {r.route}</span>
            </div>
            <button className="icon-btn text-danger" onClick={() => handleDelete(r.id)}><i className="fas fa-trash"></i></button>
          </div>
        ))}
        <button className="btn-primary mt-4" onClick={handleAddRoute}><i className="fas fa-plus"></i> Add New Route</button>
      </div>
    </div>
  );
}

export function RideHistory({ onBack }) {
  const history = [
    { id: 101, date: "Today, 09:30 AM", route: "38Y", cost: "₹35", status: "Completed" },
    { id: 102, date: "Yesterday, 06:15 PM", route: "400K", cost: "₹45", status: "Completed" },
    { id: 103, date: "Mon, 08:45 AM", route: "38Y", cost: "₹35", status: "Completed" },
  ];

  return (
    <div className="container slide-up">
      <div className="screen-header">
        <i className="fas fa-arrow-left" onClick={onBack}></i>
        <h2>Ride History</h2>
      </div>
      <div className="card-list">
        {history.map(h => (
          <div key={h.id} className="premium-card history-card">
            <div className="card-icon history-icon"><i className="fas fa-history"></i></div>
            <div className="card-content">
              <h3>Route {h.route}</h3>
              <p className="text-sm text-muted">{h.date}</p>
              <div className="status-badge"><span className="status-dot"></span> {h.status}</div>
            </div>
            <div className="card-action text-success font-bold">{h.cost}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RouteSchedules({ onBack }) {
  const schedules = [
    { route: "38Y", frequency: "Every 15 mins", first: "05:00 AM", last: "10:30 PM" },
    { route: "400K", frequency: "Every 20 mins", first: "05:30 AM", last: "10:00 PM" },
    { route: "28Z", frequency: "Every 30 mins", first: "06:00 AM", last: "09:00 PM" }
  ];

  return (
    <div className="container slide-up">
      <div className="screen-header">
        <i className="fas fa-arrow-left" onClick={onBack}></i>
        <h2>Route Schedules</h2>
      </div>
      <div className="card-list">
        {schedules.map((s, i) => (
          <div key={i} className="premium-card schedule-card">
            <div className="schedule-header">
              <span className="route-badge">{s.route}</span>
              <span className="frequency"><i className="fas fa-clock"></i> {s.frequency}</span>
            </div>
            <div className="schedule-times">
              <div className="time-block">
                <span className="text-muted text-xs uppercase">First Bus</span>
                <p className="font-bold">{s.first}</p>
              </div>
              <div className="time-block right">
                <span className="text-muted text-xs uppercase">Last Bus</span>
                <p className="font-bold">{s.last}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MyPasses({ onBack }) {
  const [isBuying, setIsBuying] = useState(false);
  const [passActive, setPassActive] = useState(true);

  const handleBuyPass = () => {
    setIsBuying(true);
    setTimeout(() => {
      setIsBuying(false);
      alert("Success! Your pass has been renewed.");
      setPassActive(true);
    }, 1500);
  };

  return (
    <div className="container slide-up">
      <div className="screen-header">
        <i className="fas fa-arrow-left" onClick={onBack}></i>
        <h2>My Passes</h2>
      </div>
      
      <div className="pass-container">
        <div className="digital-pass" style={{ opacity: passActive ? 1 : 0.6 }}>
          <div className="pass-header">
            <h3>Monthly Commuter</h3>
            {passActive ? <span className="badge-success" style={{background: 'white', color: 'black'}}>Active</span> : <span className="badge-success" style={{background: '#ef4444'}}>Expired</span>}
          </div>
          <div className="pass-body">
            <div className="qr-placeholder">
              <i className="fas fa-qrcode"></i>
            </div>
            <div className="pass-details">
              <p className="text-sm text-muted">Valid until</p>
              <h4>Aug 31, 2026</h4>
              <p className="text-sm text-muted mt-2">Pass ID</p>
              <p className="font-mono">RTC-992-8411</p>
            </div>
          </div>
          <div className="pass-footer">
            <span>City Wide Coverage</span>
            <i className="fas fa-check-circle"></i>
          </div>
        </div>
      </div>

      <button className="btn-primary mt-4 w-full" onClick={handleBuyPass} disabled={isBuying}>
        {isBuying ? <><i className="fas fa-spinner fa-spin"></i> Processing...</> : <><i className="fas fa-shopping-cart"></i> Buy New Pass</>}
      </button>
    </div>
  );
}

export function Settings({ onBack, userEmail, theme, toggleTheme }) {
  const [notifications, setNotifications] = useState(true);

  const handleLinkClick = (name) => {
    alert(`${name} functionality coming soon!`);
  };

  return (
    <div className="container slide-up">
      <div className="screen-header">
        <i className="fas fa-arrow-left" onClick={onBack}></i>
        <h2>Settings</h2>
      </div>

      <div className="settings-section">
        <div className="profile-card">
          <div className="avatar">
            <i className="fas fa-user"></i>
          </div>
          <div className="profile-info">
            <h3>{userEmail ? userEmail.split('@')[0] : 'Traveler'}</h3>
            <p>{userEmail || 'traveler@rtclive.com'}</p>
          </div>
        </div>
      </div>

      <div className="settings-list">
        <h4 className="settings-heading">Preferences</h4>
        
        <div className="setting-item">
          <div className="setting-label">
            <div className="icon-wrapper bg-indigo"><i className="fas fa-moon"></i></div>
            <span>Dark Mode</span>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <div className="icon-wrapper bg-emerald"><i className="fas fa-bell"></i></div>
            <span>Push Notifications</span>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={notifications} onChange={() => setNotifications(!notifications)} />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item clickable" onClick={() => handleLinkClick("Language Selection")}>
          <div className="setting-label">
            <div className="icon-wrapper bg-blue"><i className="fas fa-language"></i></div>
            <span>Language</span>
          </div>
          <div className="setting-value">English <i className="fas fa-chevron-right ml-2 text-muted"></i></div>
        </div>

        <h4 className="settings-heading mt-6">Support & Legal</h4>
        <div className="setting-item clickable" onClick={() => handleLinkClick("Help Center")}>
          <div className="setting-label"><i className="fas fa-question-circle text-muted"></i> Help Center</div>
          <i className="fas fa-chevron-right text-muted"></i>
        </div>
        <div className="setting-item clickable" onClick={() => handleLinkClick("Privacy Policy")}>
          <div className="setting-label"><i className="fas fa-shield-alt text-muted"></i> Privacy Policy</div>
          <i className="fas fa-chevron-right text-muted"></i>
        </div>
      </div>
    </div>
  );
}
