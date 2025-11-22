import React, { useState, useRef } from 'react';
import { useNeuroTelemetry } from '../hooks/useNeuroTelemetry';
import type { TelemetryData } from '../hooks/useNeuroTelemetry';
import { neuroGateAPI } from '../api/neurogateAPI';
import type { RiskResponse } from '../api/neurogateAPI';
import '../styles/DynamicLoginGate.css';

/**
 * Login step type
 */
export const LoginStep = {
  LOGIN: 'login',
  CHALLENGE: 'challenge',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type LoginStep = (typeof LoginStep)[keyof typeof LoginStep];

/**
 * DynamicLoginGate Component
 * 
 * Orchestrates a secure login flow with behavioral biometrics and OTP challenge.
 * 
 * Flow:
 * 1. User enters credentials while behavioral data is collected
 * 2. On submit, telemetry is analyzed by the backend
 * 3. If risky behavior detected, user is prompted for OTP
 * 4. On successful verification, user is logged in
 */
export const DynamicLoginGate: React.FC = () => {
  // Telemetry tracking
  const { getTelemetry, resetTelemetry } = useNeuroTelemetry();

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  // UI state
  const [step, setStep] = useState<LoginStep>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskResponse, setRiskResponse] = useState<RiskResponse | null>(null);

  // Refs to track telemetry and user context
  const telemetryRef = useRef<TelemetryData | null>(null);
  const userIdRef = useRef<string>('');

  /**
   * Handle login form submission
   */
  const handleLoginSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate credentials
      if (!username.trim() || !password.trim()) {
        setError('Username and password are required');
        setLoading(false);
        return;
      }

      // Collect telemetry data
      const telemetry = getTelemetry();
      telemetryRef.current = telemetry;
      userIdRef.current = username;

      // Log telemetry for debugging
      console.info('[DynamicLoginGate] Telemetry collected:', {
        entropyScore: telemetry.entropyScore,
        keystrokeCount: telemetry.keystrokeDynamics.keys.length,
        mousePointCount: telemetry.mousePath.length,
        sessionDuration: telemetry.sessionDuration,
      });

      // Call backend to verify behavior
      const response = await neuroGateAPI.verifyBehavior(username, telemetry);
      setRiskResponse(response);

      // Determine next step based on risk assessment
      if (!response.requiresChallenge) {
        // Low risk: proceed to success
        setStep('success');
        console.info('[DynamicLoginGate] Low-risk login detected, proceeding to success');
      } else {
        // High risk: require OTP challenge
        setStep('challenge');
        console.warn('[DynamicLoginGate] High-risk login detected, requiring challenge');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login verification failed';
      setError(errorMessage);
      setStep('error');
      console.error('[DynamicLoginGate] Login verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle OTP challenge submission
   */
  const handleChallengeSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate OTP
      if (!otp.trim()) {
        setError('OTP is required');
        setLoading(false);
        return;
      }

      if (otp.length < 4) {
        setError('OTP must be at least 4 characters');
        setLoading(false);
        return;
      }

      // Submit challenge response
      // In a real app, validate the OTP on the backend
      const challengeResponse = await neuroGateAPI.submitChallenge(userIdRef.current, true);

      if (challengeResponse.status === 'accepted') {
        setStep('success');
        console.info('[DynamicLoginGate] OTP challenge accepted');
      } else {
        setError(challengeResponse.message || 'OTP verification failed');
        setStep('error');
        console.warn('[DynamicLoginGate] OTP challenge rejected');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OTP submission failed';
      setError(errorMessage);
      setStep('error');
      console.error('[DynamicLoginGate] Challenge submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle reset: clear form and telemetry, return to login
   */
  const handleReset = (): void => {
    setUsername('');
    setPassword('');
    setOtp('');
    setStep('login');
    setError(null);
    setRiskResponse(null);
    resetTelemetry();
    telemetryRef.current = null;
    userIdRef.current = '';
  };

  /**
   * Render login form
   */
  const renderLoginForm = (): React.ReactNode => (
    <div className="ng-form-container">
      <h2 className="ng-title">Secure Login</h2>
      <p className="ng-subtitle">Your behavioral pattern is being analyzed for security</p>

      <form onSubmit={handleLoginSubmit} className="ng-form">
        <div className="ng-form-group">
          <label htmlFor="username" className="ng-label">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            className="ng-input"
            disabled={loading}
            required
          />
        </div>

        <div className="ng-form-group">
          <label htmlFor="password" className="ng-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="ng-input"
            disabled={loading}
            required
          />
        </div>

        {error && <div className="ng-error-message">{error}</div>}

        <button type="submit" className="ng-button ng-button-primary" disabled={loading}>
          {loading ? 'Analyzing...' : 'Login'}
        </button>
      </form>

      <div className="ng-info-box">
        <h4>🔐 Behavioral Authentication</h4>
        <p>This login system uses advanced behavioral biometrics to detect unusual access patterns and protect your account.</p>
      </div>
    </div>
  );

  /**
   * Render OTP challenge form
   */
  const renderChallengeForm = (): React.ReactNode => (
    <div className="ng-form-container">
      <h2 className="ng-title">Verify Your Identity</h2>
      <p className="ng-subtitle">
        Unusual login activity detected. Please enter the verification code sent to your email.
      </p>

      <div className="ng-risk-indicator">
        <span className="ng-risk-badge">⚠️ RISK DETECTED</span>
        <div className="ng-risk-details">
          <p>Trust Score: <strong>{riskResponse?.trustScore.toFixed(2)}</strong>/100</p>
        </div>
      </div>

      <form onSubmit={handleChallengeSubmit} className="ng-form">
        <div className="ng-form-group">
          <label htmlFor="otp" className="ng-label">
            Verification Code
          </label>
          <input
            id="otp"
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.toUpperCase())}
            placeholder="Enter 6-digit code"
            maxLength={8}
            className="ng-input ng-input-otp"
            disabled={loading}
            required
          />
        </div>

        {error && <div className="ng-error-message">{error}</div>}

        <div className="ng-button-group">
          <button type="submit" className="ng-button ng-button-primary" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          <button
            type="button"
            className="ng-button ng-button-secondary"
            onClick={handleReset}
            disabled={loading}
          >
            Back to Login
          </button>
        </div>
      </form>
    </div>
  );

  /**
   * Render success state
   */
  const renderSuccess = (): React.ReactNode => (
    <div className="ng-form-container ng-success-container">
      <div className="ng-success-icon">✓</div>
      <h2 className="ng-title">Login Successful</h2>
      <p className="ng-subtitle">Your identity has been verified</p>

      {riskResponse && (
        <div className="ng-success-details">
          <p>Trust Score: <strong>{riskResponse.trustScore.toFixed(2)}</strong>/100</p>
          <p>Behavioral Pattern: <strong>Verified</strong></p>
        </div>
      )}

      <button
        type="button"
        className="ng-button ng-button-primary"
        onClick={handleReset}
      >
        New Login Session
      </button>
    </div>
  );

  /**
   * Render error state
   */
  const renderError = (): React.ReactNode => (
    <div className="ng-form-container ng-error-container">
      <div className="ng-error-icon">✕</div>
      <h2 className="ng-title">Login Failed</h2>
      <p className="ng-subtitle">{error}</p>

      <button
        type="button"
        className="ng-button ng-button-primary"
        onClick={handleReset}
      >
        Try Again
      </button>
    </div>
  );

  // Render appropriate UI based on current step
  return (
    <div className="ng-container">
      <div className="ng-card">
        {step === 'login' && renderLoginForm()}
        {step === 'challenge' && renderChallengeForm()}
        {step === 'success' && renderSuccess()}
        {step === 'error' && renderError()}
      </div>
    </div>
  );
};

export default DynamicLoginGate;
