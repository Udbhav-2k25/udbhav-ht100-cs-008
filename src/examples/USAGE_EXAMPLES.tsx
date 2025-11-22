/**
 * Example Usage: Integrating NeuroGate SDK into your Application
 * 
 * This file demonstrates best practices for using the NeuroGate SDK
 * in a real-world React application.
 * 
 * To use these examples, import this file into your App.tsx:
 * import AllExamples from './examples/USAGE_EXAMPLES';
 */

import React from 'react';
import { DynamicLoginGate } from '../components/DynamicLoginGate';
import { neuroGateAPI } from '../api/neurogateAPI';
import { useNeuroTelemetry } from '../hooks/useNeuroTelemetry';

// ============================================================================
// EXAMPLE 1: Basic Usage - Drop-in Component
// ============================================================================
export const BasicExample: React.FC = () => {
  return (
    <div>
      <header>
        <h1>My Secure App</h1>
      </header>
      <main>
        {/* Just import and use - it handles everything! */}
        <DynamicLoginGate />
      </main>
    </div>
  );
};

// ============================================================================
// EXAMPLE 2: Advanced Usage - Manual Telemetry Capture
// ============================================================================
export const AdvancedExample: React.FC = () => {
  const { getTelemetry, resetTelemetry } = useNeuroTelemetry();
  const [telemetryLog, setTelemetryLog] = React.useState<string>('');

  const handleCaptureTelemetry = (): void => {
    const telemetry = getTelemetry();
    const log = `
=== TELEMETRY SNAPSHOT ===
Timestamp: ${new Date(telemetry.timestamp).toISOString()}
Session Duration: ${telemetry.sessionDuration}ms
Entropy Score: ${telemetry.entropyScore.toFixed(2)}/100

Keystroke Dynamics:
- Keys Pressed: ${telemetry.keystrokeDynamics.keys.length}
- Avg Flight Time: ${telemetry.keystrokeDynamics.flightTimes.length > 0 
  ? (telemetry.keystrokeDynamics.flightTimes.reduce((a: number, b: number) => a + b) / telemetry.keystrokeDynamics.flightTimes.length).toFixed(2)
  : 'N/A'} ms
- Avg Dwell Time: ${telemetry.keystrokeDynamics.dwellTimes.length > 0 
  ? (telemetry.keystrokeDynamics.dwellTimes.reduce((a: number, b: number) => a + b) / telemetry.keystrokeDynamics.dwellTimes.length).toFixed(2)
  : 'N/A'} ms

Mouse Dynamics:
- Total Points: ${telemetry.mousePath.length}
- Entropy: Higher values indicate more natural movement
    `;

    setTelemetryLog(log);
    console.log('Full Telemetry:', telemetry);
  };

  const handleReset = (): void => {
    resetTelemetry();
    setTelemetryLog('');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Telemetry Inspector</h2>
      <p>Type and move your mouse to collect behavioral data</p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={handleCaptureTelemetry}>Capture Telemetry</button>
        <button onClick={handleReset}>Reset</button>
      </div>

      <textarea
        value={telemetryLog}
        readOnly
        style={{
          width: '100%',
          height: '400px',
          fontFamily: 'monospace',
          padding: '1rem',
          backgroundColor: '#f5f5f5',
        }}
      />
    </div>
  );
};

// ============================================================================
// EXAMPLE 3: API Configuration - Setting Headers and Base URL
// ============================================================================
export const ConfigurationExample: React.FC = () => {
  const [isHealthy, setIsHealthy] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const checkHealth = async (): Promise<void> => {
      try {
        // Configure the API client before use
        neuroGateAPI.setBaseURL('http://localhost:3000/api/v1');
        neuroGateAPI.setHeaders({
          'Authorization': 'Bearer demo-token-123',
          'X-Client-Version': '1.0.0',
        });

        // Check if backend is available
        const healthy = await neuroGateAPI.healthCheck();
        setIsHealthy(healthy);

        if (healthy) {
          console.log('✅ NeuroGate Backend is online');
        } else {
          console.warn('⚠️ NeuroGate Backend is offline');
        }
      } catch (error) {
        console.error('Health check failed:', error);
        setIsHealthy(false);
      }
    };

    checkHealth();
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>API Status</h2>
      {isHealthy === null && <p>Checking...</p>}
      {isHealthy === true && <p style={{ color: 'green' }}>✅ Backend is online</p>}
      {isHealthy === false && <p style={{ color: 'red' }}>❌ Backend is offline</p>}
    </div>
  );
};

// ============================================================================
// EXAMPLE 4: Custom Error Handling
// ============================================================================
export const ErrorHandlingExample: React.FC = () => {
  const { getTelemetry } = useNeuroTelemetry();
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<string | null>(null);

  const handleManualVerification = async (): Promise<void> => {
    try {
      setError(null);
      setResult(null);

      const telemetry = getTelemetry();

      // Simulate a verify request
      const response = await neuroGateAPI.verifyBehavior('test-user', telemetry);

      setResult(
        `✅ Verification Success!\n` +
        `Trust Score: ${response.trustScore.toFixed(2)}/100\n` +
        `Challenge Required: ${response.requiresChallenge}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`❌ Error: ${message}`);
      console.error('Verification error:', err);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Manual Verification Test</h2>
      <button onClick={handleManualVerification}>Verify Behavior</button>

      {error && <pre style={{ color: 'red', backgroundColor: '#fee', padding: '1rem' }}>{error}</pre>}
      {result && (
        <pre style={{ color: 'green', backgroundColor: '#efe', padding: '1rem' }}>{result}</pre>
      )}
    </div>
  );
};

// ============================================================================
// EXAMPLE 5: Multi-Step Form with Behavioral Analytics
// ============================================================================
export const FormAnalyticsExample: React.FC = () => {
  const { getTelemetry, resetTelemetry } = useNeuroTelemetry();
  const [analytics, setAnalytics] = React.useState<any>(null);

  const handleFormSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    const telemetry = getTelemetry();

    // Analyze the behavioral data
    const analysis = {
      behavioralRisk: telemetry.entropyScore > 50 ? 'LOW' : 'HIGH',
      engagementTime: telemetry.sessionDuration,
      keyboardActivity: telemetry.keystrokeDynamics.keys.length,
      mouseActivity: telemetry.mousePath.length,
      timestamp: new Date(telemetry.timestamp).toISOString(),
    };

    setAnalytics(analysis);
    console.log('📊 Form Analytics:', analysis);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Form with Behavioral Analytics</h2>

      <form onSubmit={handleFormSubmit}>
        <input type="email" placeholder="Email" required />
        <textarea placeholder="Message" rows={5} required />
        <button type="submit">Submit (Behavioral Data Collected)</button>
      </form>

      {analytics && (
        <div style={{ marginTop: '2rem', backgroundColor: '#f0f0f0', padding: '1rem' }}>
          <h3>Analytics</h3>
          <pre>{JSON.stringify(analytics, null, 2)}</pre>
          <button onClick={() => { setAnalytics(null); resetTelemetry(); }}>
            Reset
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXAMPLE 6: Environment-Specific Configuration
// ============================================================================
export const EnvironmentSetupExample: React.FC = () => {
  React.useEffect(() => {
    // Configure based on environment
    const isProduction = import.meta.env.MODE === 'production';

    if (isProduction) {
      // Production: Use HTTPS and real backend
      neuroGateAPI.setBaseURL('https://api.production.com/api/v1');
      neuroGateAPI.setHeaders({
        'Authorization': `Bearer ${import.meta.env.VITE_API_TOKEN as string}`,
      });
    } else {
      // Development: Use localhost
      neuroGateAPI.setBaseURL('http://localhost:3000/api/v1');
    }

    console.log(`[NeuroGate] Initialized for ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Environment Configuration</h2>
      <p>Check console for environment setup details</p>
    </div>
  );
};

// ============================================================================
// Export all examples
// ============================================================================
export const AllExamples: React.FC = () => {
  const [activeExample, setActiveExample] = React.useState<'basic' | 'advanced' | 'config' | 'error' | 'analytics' | 'env'>(
    'basic'
  );

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <nav style={{ width: '200px', backgroundColor: '#333', color: 'white', padding: '1rem' }}>
        <h3>Examples</h3>
        <button onClick={() => setActiveExample('basic')}>Basic Usage</button>
        <button onClick={() => setActiveExample('advanced')}>Advanced (Manual)</button>
        <button onClick={() => setActiveExample('config')}>Configuration</button>
        <button onClick={() => setActiveExample('error')}>Error Handling</button>
        <button onClick={() => setActiveExample('analytics')}>Form Analytics</button>
        <button onClick={() => setActiveExample('env')}>Environment</button>
      </nav>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeExample === 'basic' && <BasicExample />}
        {activeExample === 'advanced' && <AdvancedExample />}
        {activeExample === 'config' && <ConfigurationExample />}
        {activeExample === 'error' && <ErrorHandlingExample />}
        {activeExample === 'analytics' && <FormAnalyticsExample />}
        {activeExample === 'env' && <EnvironmentSetupExample />}
      </div>
    </div>
  );
};

export default AllExamples;
