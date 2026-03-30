import React, { useEffect } from 'react';
import './PreLogin.css';

const PreLogin = ({ onNavigate }) => {
  // Add body class on mount and remove on unmount to scope styles if needed,
  // but since we are using specific CSS, it's better to wrap in a div.
  return (
    <div className="prelogin-page">
      {/* Background Animations Layer */}
      <div className="bg-container">
        {/* Football Pitch Outline in Perspective */}
        <svg className="bg-pitch pt-anim" viewBox="0 0 450 300" xmlns="http://www.w3.org/2000/svg">
          <g stroke="rgba(255,255,255,0.04)" strokeWidth="2" fill="none">
            <rect x="10" y="10" width="430" height="280"></rect>
            <line x1="225" y1="10" x2="225" y2="290"></line>
            <circle cx="225" cy="150" r="40"></circle>
            <rect x="10" y="60" width="80" height="180"></rect>
            <rect x="360" y="60" width="80" height="180"></rect>
            <rect x="10" y="100" width="30" height="100"></rect>
            <rect x="410" y="100" width="30" height="100"></rect>
            <circle cx="65" cy="150" r="2" fill="rgba(255,255,255,0.04)"></circle>
            <circle cx="385" cy="150" r="2" fill="rgba(255,255,255,0.04)"></circle>
          </g>
        </svg>

        {/* Bar Chart */}
        <svg className="bg-bar-chart float-1" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
          <g fill="rgba(59, 130, 246, 0.08)">
            <rect x="20" y="80" width="20" height="70" rx="4"></rect>
            <rect x="60" y="40" width="20" height="110" rx="4"></rect>
            <rect x="100" y="90" width="20" height="60" rx="4"></rect>
            <rect x="140" y="20" width="20" height="130" rx="4"></rect>
          </g>
        </svg>

        {/* Radar Chart */}
        <svg className="bg-radar float-2" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <g stroke="rgba(20, 184, 166, 0.1)" strokeWidth="1.5" fill="none">
            <polygon points="100,20 176,75 147,164 53,164 24,75"></polygon>
            <polygon points="100,50 148,85 129,141 71,141 52,85"></polygon>
            <line x1="100" y1="100" x2="100" y2="20"></line>
            <line x1="100" y1="100" x2="176" y2="75"></line>
            <line x1="100" y1="100" x2="147" y2="164"></line>
            <line x1="100" y1="100" x2="53" y2="164"></line>
            <line x1="100" y1="100" x2="24" y2="75"></line>
            <polygon points="100,40 160,82 110,150 63,134 44,70" fill="rgba(20, 184, 166, 0.05)" stroke="rgba(20, 184, 166, 0.2)"></polygon>
          </g>
        </svg>

        {/* Line Chart */}
        <svg className="bg-line-chart float-3" viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg">
          <path d="M10,130 Q50,90 100,100 T200,50 T290,20" fill="none" stroke="rgba(139, 92, 246, 0.08)" strokeWidth="4"></path>
          <circle cx="10" cy="130" r="4" fill="rgba(139, 92, 246, 0.15)"></circle>
          <circle cx="100" cy="100" r="4" fill="rgba(139, 92, 246, 0.15)"></circle>
          <circle cx="200" cy="50" r="4" fill="rgba(139, 92, 246, 0.15)"></circle>
          <circle cx="290" cy="20" r="4" fill="rgba(139, 92, 246, 0.15)"></circle>
        </svg>

        {/* Ambient Data Text */}
        <div className="ambient-text text-1">Score 89</div>
        <div className="ambient-text text-2">ROI 33%</div>
        <div className="ambient-text text-3">€ 1.2M</div>
        <div className="ambient-text text-4">95.2</div>
      </div>

      {/* UI Overlay Layer */}
      <div className="ui-layer">
        <header className="navbar">
          <div className="logo-wrapper">
            <div className="icon-circle">
              <div className="icon-q">Q</div>
              <div className="icon-dot"></div>
            </div>
            <span className="logo-text">ScoutIQ</span>
          </div>
          <nav className="nav-links">
            <a href="#solucao" onClick={(e) => e.preventDefault()}>A Solução</a>
            <a href="#metodologia" onClick={(e) => e.preventDefault()}>Metodologia</a>
            <a href="#planos" onClick={(e) => e.preventDefault()}>Planos</a>
            <button 
              className="btn-login-nav" 
              onClick={() => onNavigate('login')}
              style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px' }}
            >
              Entrar
            </button>
          </nav>
        </header>

        <main className="hero-section">
          <div className="hero-text">
            <h1>Contratações exatas.<br />Orçamentos otimizados.</h1>
            <p>Vá além do "feeling" do olheiro. O ScoutIQ cruza o desempenho técnico em campo com o valor de mercado, revelando os talentos ideais que cabem na realidade financeira do seu clube.</p>
            <button className="btn-premium">Agendar Demonstração</button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PreLogin;
