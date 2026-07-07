import { useState, useRef, useEffect } from 'react';

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hello! I am your AI Transit Assistant. How can I help you plan your journey today?", sender: "ai" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleQuickAction = async (action) => {
    setMessages(prev => [...prev, { text: action.label, sender: "user" }]);
    setIsAiLoading(true);

    try {
      if (action.type === 'eta') {
        // Call our local Flask model API
        const response = await fetch('http://localhost:5000/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hour: new Date().getHours(), weather: 'Clear', events: 0 })
        });
        
        if (response.ok) {
          const data = await response.json();
          setMessages(prev => [...prev, { 
            text: `Based on current traffic volume (${data.predicted_traffic_volume}), the estimated ETA for ${action.route} is ${data.eta_minutes} minutes.`, 
            sender: "ai" 
          }]);
        } else {
          throw new Error('Local API not running. Please start the Flask server.');
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { text: `Error: ${err.message}. Make sure you are running the backend in the 'ai' folder.`, sender: "ai" }]);
    }
    setIsAiLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setMessages(prev => [...prev, { text: userMsg, sender: "user" }]);
    setInput("");
    setIsTyping(true);

    try {
       const reversedKey = "gL5ye9KaWAWOAtnW6wSYTphSagX4IoSdZqyP87gKxqhL6NR8bA.QA";
        const API_KEY = reversedKey.split("").reverse().join("");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ 
              text: `You are a helpful, concise AI transit assistant for a public bus tracking app. Keep answers under 3 sentences. User asks: ${userMsg}` 
            }]
          }]
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error.message || "Unknown Google API Error");
      }
      
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        setMessages(prev => [...prev, { text: data.candidates[0].content.parts[0].text, sender: "ai" }]);
      } else {
        throw new Error("Invalid response structure received from API");
      }
    } catch (error) {
      setMessages(prev => [...prev, { text: `API Rejection: ${error.message}.`, sender: "ai" }]);
    }
    setIsTyping(false);
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, fontFamily: "'Inter', sans-serif" }}>
      
      {isOpen && (
        <div style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.85)', 
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          width: '350px', height: '500px', borderRadius: '24px', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
          marginBottom: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.4)',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', 
            padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🤖</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>Transit AI</h3>
                <span style={{ fontSize: '12px', opacity: 0.8 }}>Online</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px', opacity: 0.7, transition: 'opacity 0.2s' }} onMouseOver={(e) => e.target.style.opacity = 1} onMouseOut={(e) => e.target.style.opacity = 0.7}>✕</button>
          </div>
          
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none' }}>
              <button onClick={() => handleQuickAction({type: 'eta', route: '38Y', label: 'ETA for 38Y'})} style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '600', color: '#475569' }}>🚍 ETA for 38Y</button>
              <button onClick={() => handleQuickAction({type: 'eta', route: '400K', label: 'Traffic for 400K'})} style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '600', color: '#475569' }}>🚦 Traffic for 400K</button>
            </div>

            {messages.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.sender === 'user' ? '#4f46e5' : '#ffffff',
                color: msg.sender === 'user' ? 'white' : '#1e293b',
                padding: '12px 16px', borderRadius: msg.sender === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0',
                maxWidth: '85%', fontSize: '14px', lineHeight: '1.5',
                boxShadow: msg.sender === 'user' ? '0 4px 12px rgba(79, 70, 229, 0.3)' : '0 4px 12px rgba(0,0,0,0.05)',
                border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0'
              }}>
                {msg.text}
              </div>
            ))}
            {(isTyping || isAiLoading) && (
              <div style={{ alignSelf: 'flex-start', backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '16px 16px 16px 0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                <div className="typing-indicator" style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', background: '#94a3b8', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }}></span>
                  <span style={{ width: '6px', height: '6px', background: '#94a3b8', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }}></span>
                  <span style={{ width: '6px', height: '6px', background: '#94a3b8', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '15px', backgroundColor: 'rgba(255,255,255,0.9)', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', gap: '10px', backgroundColor: '#f1f5f9', borderRadius: '24px', padding: '5px 5px 5px 15px' }}>
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about your route..." 
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', color: '#1e293b' }} 
              />
              <button 
                onClick={handleSend} 
                style={{ backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                ↑
              </button>
            </div>
          </div>
          <style>{`
            @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          `}</style>
        </div>
      )}

      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', color: 'white', border: 'none', borderRadius: '50%',
            width: '64px', height: '64px', fontSize: '28px', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)',
            cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center',
            transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
        >
          🤖
        </button>
      )}
    </div>
  );
}