/**
 * NeuroGate Admin Dashboard
 * Real-time monitoring of security events and login attempts
 * Dark-themed cybersecurity command center UI
 */

import React, { useState, useEffect } from 'react';
import adminAPI from '../api/adminAPI';
import type { SecurityEvent, DashboardStats } from '../api/adminAPI';
import '../styles/AdminDashboard.css';

// ==================== ADMIN DASHBOARD COMPONENT ====================

export const AdminDashboard: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalLogins: 0,
    averageTrustScore: 0,
    threatsBlocked: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(2000); // 2 seconds

  // ==================== FETCH EVENTS ====================

  const fetchEvents = async () => {
    try {
      const securityEvents = await adminAPI.fetchSecurityEvents();
      setEvents(securityEvents);
      const calculatedStats = adminAPI.calculateStats(securityEvents);
      setStats(calculatedStats);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('[AdminDashboard] Error fetching events:', err);
      setError('Failed to fetch security events. Is the backend running?');
      setLoading(false);
    }
  };

  // ==================== USEEFFECT INTERVAL ====================

  useEffect(() => {
    // Initial fetch
    fetchEvents();

    // Auto-refresh every 2 seconds (simulating real-time monitoring)
    const interval = setInterval(fetchEvents, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // ==================== RENDER ====================

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>⚔️ NeuroGate Command Center</h1>
          <p className="header-subtitle">Real-time Behavioral Authentication Monitoring</p>
        </div>
        <div className="header-status">
          <span className={`status-indicator ${loading ? 'loading' : 'active'}`}>
            {loading ? '◌ Connecting...' : '● LIVE'}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={fetchEvents} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatCard
          title="Total Logins"
          value={stats.totalLogins}
          icon="📊"
          color="#00FF00"
          format="number"
        />
        <StatCard
          title="Avg Trust Score"
          value={stats.averageTrustScore}
          icon="🔐"
          color="#00FFFF"
          format="number"
          suffix="%"
        />
        <StatCard
          title="Threats Blocked"
          value={stats.threatsBlocked}
          icon="🛡️"
          color="#FF0000"
          format="number"
        />
      </div>

      {/* Live Traffic Table */}
      <div className="events-container">
        <div className="events-header">
          <h2>🔴 LIVE TRAFFIC</h2>
          <div className="events-info">
            <span className="event-count">{events.length} events</span>
            <span className="refresh-rate">Updates every {refreshInterval}ms</span>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="no-events">
            <p>⏳ Waiting for login attempts...</p>
            <p className="no-events-hint">Events will appear here as users authenticate</p>
          </div>
        ) : (
          <div className="events-table-wrapper">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User ID</th>
                  <th>IP Address</th>
                  <th>Trust Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 20).map((event) => (
                  <tr key={event.id} className={`event-row status-${event.status}`}>
                    <td className="time-cell" data-label="Time">
                      <code>{event.time}</code>
                    </td>
                    <td className="userid-cell" data-label="User ID">
                      <code>{event.userId}</code>
                    </td>
                    <td className="ip-cell" data-label="IP Address">
                      <code>{event.ip}</code>
                    </td>
                    <td className="score-cell" data-label="Trust Score">
                      <div className="score-bar">
                        <div
                          className="score-fill"
                          style={{
                            width: `${Math.max(0, Math.min(100, event.trustScore))}%`,
                            backgroundColor: adminAPI.getStatusColor(event.trustScore),
                          }}
                        />
                        <span className="score-text">
                          {event.trustScore.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="status-cell" data-label="Status">
                      <span className={`status-badge status-${event.status}`}>
                        {event.status === 'success' && '✅ SUCCESS'}
                        {event.status === 'challenged' && '⚠️ CHALLENGED'}
                        {event.status === 'blocked' && '❌ BLOCKED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="dashboard-footer">
        <div className="footer-info">
          <p>Backend: <code>http://localhost:3000</code></p>
          <p>Last Update: <code>{new Date().toLocaleTimeString()}</code></p>
        </div>
        <div className="footer-controls">
          <button
            onClick={fetchEvents}
            className="action-button refresh-button"
            title="Manually refresh events"
          >
            🔄 Refresh Now
          </button>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="refresh-select"
            title="Auto-refresh interval"
          >
            <option value={1000}>1s Refresh</option>
            <option value={2000}>2s Refresh</option>
            <option value={5000}>5s Refresh</option>
            <option value={10000}>10s Refresh</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// ==================== STAT CARD COMPONENT ====================

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
  format: 'number' | 'percent';
  suffix?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, format, suffix }) => {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <h3 className="stat-title">{title}</h3>
        <div className="stat-value" style={{ color }}>
          {format === 'number' ? (
            <>
              <span className="value-number">{Math.round(value)}</span>
              {suffix && <span className="value-suffix">{suffix}</span>}
            </>
          ) : (
            <>
              <span className="value-number">{value.toFixed(1)}</span>
              <span className="value-suffix">%</span>
            </>
          )}
        </div>
      </div>
      <div className="stat-border" style={{ borderColor: color }} />
    </div>
  );
};

export default AdminDashboard;
