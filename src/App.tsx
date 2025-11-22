import { useState } from 'react';
import { DynamicLoginGate } from './components/DynamicLoginGate';
import { AdminDashboard } from './components/AdminDashboard';
import './App.css';

type View = 'home' | 'login' | 'admin';

function App() {
  const [view, setView] = useState<View>('home');

  return (
    <div style={styles.app}>
      {/* Navigation Bar */}
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <div style={styles.logo}>🔐 NeuroGate</div>
          <div style={styles.navLinks}>
            <button onClick={() => setView('home')} style={{ ...styles.navBtn, backgroundColor: view === 'home' ? '#00ff64' : 'transparent' }}>
              Home
            </button>
            <button onClick={() => setView('login')} style={{ ...styles.navBtn, backgroundColor: view === 'login' ? '#00ff64' : 'transparent' }}>
              Login Demo
            </button>
            <button onClick={() => setView('admin')} style={{ ...styles.navBtn, backgroundColor: view === 'admin' ? '#00ff64' : 'transparent' }}>
              Admin Panel
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={styles.main}>
        {view === 'home' && <HomePage onNavigate={setView} />}
        {view === 'login' && <DynamicLoginGate />}
        {view === 'admin' && <AdminDashboard />}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>Backend: <a href="http://localhost:3000" target="_blank">http://localhost:3000</a> | React + TypeScript | Behavioral Biometrics</p>
      </footer>
    </div>
  );
}

function HomePage({ onNavigate }: { onNavigate: (view: View) => void }) {
  return (
    <div style={styles.homepage}>
      <div style={styles.hero}>
        <h1 style={styles.title}>🧠 NeuroGate</h1>
        <p style={styles.subtitle}>Behavioral Biometrics Authentication SDK</p>
        <p style={styles.description}>
          Advanced human vs bot detection using physics-based challenges and behavioral analysis
        </p>
      </div>

      <div style={styles.features}>
        <div style={styles.featureGrid}>
          <FeatureCard
            icon="📊"
            title="Behavioral Analysis"
            description="Real-time tracking of mouse movement, keystroke dynamics, and click patterns"
          />
          <FeatureCard
            icon="🤖"
            title="Bot Detection"
            description="5-layer physics analysis to distinguish humans from automated attacks"
          />
          <FeatureCard
            icon="🎯"
            title="Physics Challenge"
            description="GravityChallenge component with LERP animation and confidence scoring"
          />
          <FeatureCard
            icon="📈"
            title="Risk Scoring"
            description="Zero-knowledge ML model for adaptive authentication decisions"
          />
          <FeatureCard
            icon="📱"
            title="Multi-Factor"
            description="Combines behavioral data with optional OTP and physics challenges"
          />
          <FeatureCard
            icon="🎨"
            title="Cyberpunk UI"
            description="Neon-themed interface with real-time status indicators"
          />
        </div>
      </div>

      <div style={styles.demoSection}>
        <h2 style={styles.sectionTitle}>Interactive Demos</h2>
        <div style={styles.demoGrid}>
          <DemoBox
            title="🔓 Login Demo"
            description="Try the full authentication flow with behavioral telemetry"
            buttonText="Start Login"
            onClick={() => onNavigate('login')}
            color="#00ff64"
          />
          <DemoBox
            title="📊 Admin Dashboard"
            description="Monitor authentication events and risk scores in real-time"
            buttonText="View Dashboard"
            onClick={() => onNavigate('admin')}
            color="#ff6b00"
          />
        </div>
      </div>

      <div style={styles.statusSection}>
        <h2 style={styles.sectionTitle}>System Status</h2>
        <div style={styles.statusGrid}>
          <StatusCard label="Frontend" status="✅ Running" color="#00ff64" />
          <StatusCard label="Backend (Go)" status="✅ Running" color="#00ff64" />
          <StatusCard label="TypeScript" status="✅ Strict Mode" color="#00ff64" />
          <StatusCard label="Build" status="✅ 0 Errors" color="#00ff64" />
        </div>
      </div>

      <div style={styles.architecture}>
        <h2 style={styles.sectionTitle}>Architecture</h2>
        <div style={styles.architectureContent}>
          <div style={styles.arcBox}>
            <h3>Frontend (React + TypeScript)</h3>
            <ul>
              <li>✅ DynamicLoginGate - Multi-step login flow</li>
              <li>✅ useNeuroTelemetry - Behavior tracking</li>
              <li>✅ GravityChallenge - Physics-based verification</li>
              <li>✅ AdminDashboard - Real-time monitoring</li>
            </ul>
          </div>
          <div style={styles.arrow}>→</div>
          <div style={styles.arcBox}>
            <h3>Backend (Go)</h3>
            <ul>
              <li>✅ POST /api/v1/verify - Telemetry analysis</li>
              <li>✅ POST /api/v1/challenge - Challenge submission</li>
              <li>✅ GET /api/v1/admin/events - Event log</li>
              <li>✅ CORS enabled (localhost:5173/5174)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: any) {
  return (
    <div style={styles.featureCard}>
      <div style={styles.featureIcon}>{icon}</div>
      <h3 style={styles.featureTitle}>{title}</h3>
      <p style={styles.featureDesc}>{description}</p>
    </div>
  );
}

function DemoBox({ title, description, buttonText, onClick, color }: any) {
  return (
    <div style={{ ...styles.demoBox, borderColor: color }}>
      <h3 style={styles.demoTitle}>{title}</h3>
      <p style={styles.demoDesc}>{description}</p>
      <button style={{ ...styles.demoBtn, backgroundColor: color }} onClick={onClick}>
        {buttonText}
      </button>
    </div>
  );
}

function StatusCard({ label, status, color }: any) {
  return (
    <div style={styles.statusCard}>
      <div style={styles.statusLabel}>{label}</div>
      <div style={{ ...styles.statusValue, color }}>{status}</div>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#000814',
    color: '#00ff64',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  navbar: {
    backgroundColor: 'rgba(0, 10, 20, 0.95)',
    borderBottom: '2px solid rgba(0, 255, 100, 0.2)',
    padding: '16px 0',
    position: 'sticky' as const,
    top: 0,
    zIndex: 1000,
    boxShadow: '0 0 20px rgba(0, 255, 100, 0.1)',
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: '24px',
    fontWeight: 'bold',
    textShadow: '0 0 10px rgba(0, 255, 100, 0.5)',
  },
  navLinks: {
    display: 'flex',
    gap: '12px',
  },
  navBtn: {
    padding: '8px 16px',
    border: '2px solid rgba(0, 255, 100, 0.3)',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: '#00ff64',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    textTransform: 'uppercase' as const,
    fontSize: '12px',
    letterSpacing: '1px',
  },
  main: {
    flex: 1,
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    padding: '40px 24px',
  },
  footer: {
    textAlign: 'center' as const,
    padding: '24px',
    borderTop: '1px solid rgba(0, 255, 100, 0.2)',
    fontSize: '12px',
    color: '#00ff64',
    opacity: 0.7,
  },
  homepage: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '60px',
  },
  hero: {
    textAlign: 'center' as const,
    marginBottom: '20px',
  },
  title: {
    fontSize: '48px',
    fontWeight: 'bold',
    marginBottom: '12px',
    textShadow: '0 0 30px rgba(0, 255, 100, 0.6)',
  },
  subtitle: {
    fontSize: '24px',
    color: '#00ff64',
    marginBottom: '12px',
    opacity: 0.8,
  },
  description: {
    fontSize: '16px',
    color: '#00ff64',
    opacity: 0.7,
    maxWidth: '600px',
    margin: '0 auto',
  },
  features: {
    backgroundColor: 'rgba(0, 20, 40, 0.5)',
    border: '1px solid rgba(0, 255, 100, 0.2)',
    borderRadius: '12px',
    padding: '40px',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  featureCard: {
    backgroundColor: 'rgba(0, 10, 20, 0.8)',
    border: '1px solid rgba(0, 255, 100, 0.2)',
    borderRadius: '8px',
    padding: '24px',
    textAlign: 'center' as const,
  },
  featureIcon: {
    fontSize: '40px',
    marginBottom: '12px',
  },
  featureTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#00ff64',
  },
  featureDesc: {
    fontSize: '13px',
    color: '#00ff64',
    opacity: 0.7,
    lineHeight: '1.5',
  },
  demoSection: {
    marginTop: '20px',
  },
  sectionTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '24px',
    textShadow: '0 0 20px rgba(0, 255, 100, 0.4)',
  },
  demoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '24px',
  },
  demoBox: {
    backgroundColor: 'rgba(0, 10, 20, 0.8)',
    border: '2px solid',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center' as const,
  },
  demoTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    marginBottom: '12px',
  },
  demoDesc: {
    fontSize: '14px',
    color: '#00ff64',
    opacity: 0.7,
    marginBottom: '20px',
    lineHeight: '1.6',
  },
  demoBtn: {
    padding: '12px 32px',
    border: 'none',
    borderRadius: '6px',
    color: '#000814',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  statusSection: {
    backgroundColor: 'rgba(0, 20, 40, 0.5)',
    border: '1px solid rgba(0, 255, 100, 0.2)',
    borderRadius: '12px',
    padding: '32px',
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  statusCard: {
    backgroundColor: 'rgba(0, 10, 20, 0.8)',
    border: '1px solid rgba(0, 255, 100, 0.2)',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center' as const,
  },
  statusLabel: {
    fontSize: '12px',
    color: '#00ff64',
    opacity: 0.6,
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  statusValue: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  architecture: {
    marginTop: '20px',
  },
  architectureContent: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '32px',
    flexWrap: 'wrap' as const,
  },
  arcBox: {
    backgroundColor: 'rgba(0, 10, 20, 0.8)',
    border: '1px solid rgba(0, 255, 100, 0.3)',
    borderRadius: '8px',
    padding: '24px',
    minWidth: '350px',
  },
  arrow: {
    fontSize: '32px',
    color: '#00ff64',
    opacity: 0.5,
  },
};

export default App;
