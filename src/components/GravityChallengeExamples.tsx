/**
 * GravityChallenge - Usage Examples
 * 
 * File: src/components/GravityChallengeExamples.tsx
 * 
 * Four complete, working examples of how to implement
 * the GravityChallenge component in different scenarios.
 */

import React, { useState } from 'react';
import { GravityChallenge } from './GravityChallenge';

// ========== EXAMPLE 1: Minimal Implementation ==========

/**
 * The simplest possible implementation.
 * Just render the component with callbacks.
 */
export function MinimalExample() {
  return (
    <GravityChallenge
      onSuccess={(proof) => {
        console.log('✅ Human verified with proof:', proof);
      }}
      onFail={() => {
        console.log('❌ Bot detected');
      }}
    />
  );
}

// ========== EXAMPLE 2: With State Management ==========

/**
 * Track authentication state and show different UI
 * based on the result of the physics challenge.
 */
export function StateManagementExample() {
  const [authState, setAuthState] = useState<'pending' | 'verified' | 'failed'>('pending');
  const [proof, setProof] = useState<string | null>(null);

  const handleSuccess = (physicsProof: string) => {
    console.log('✅ Physics verification successful');
    console.log('Proof token:', physicsProof);
    
    setProof(physicsProof);
    setAuthState('verified');
  };

  const handleFail = () => {
    console.error('❌ Physics verification failed - bot detected');
    setAuthState('failed');
  };

  return (
    <div style={{ padding: '20px' }}>
      {authState === 'pending' && (
        <>
          <h2>Verify Your Humanity</h2>
          <GravityChallenge 
            onSuccess={handleSuccess}
            onFail={handleFail}
          />
        </>
      )}

      {authState === 'verified' && (
        <div style={{
          padding: '20px',
          backgroundColor: 'rgba(0, 255, 100, 0.1)',
          border: '2px solid #00ff64',
          borderRadius: '8px',
          color: '#00ff64',
          fontFamily: 'monospace',
        }}>
          <h3>✅ Authentication Successful!</h3>
          <p>Physics-based verification complete.</p>
          <p style={{ fontSize: '12px', wordBreak: 'break-all' }}>
            Proof: {proof?.substring(0, 50)}...
          </p>
          <button 
            onClick={() => {
              setAuthState('pending');
              setProof(null);
            }}
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              backgroundColor: '#00ff64',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {authState === 'failed' && (
        <div style={{
          padding: '20px',
          backgroundColor: 'rgba(255, 0, 64, 0.1)',
          border: '2px solid #ff0040',
          borderRadius: '8px',
          color: '#ff0040',
          fontFamily: 'monospace',
        }}>
          <h3>❌ Bot Behavior Detected</h3>
          <p>The physics analysis detected bot-like movement patterns.</p>
          <p style={{ fontSize: '12px' }}>Please try again with natural movement.</p>
          <button 
            onClick={() => {
              setAuthState('pending');
              setProof(null);
            }}
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              backgroundColor: '#ff0040',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

// ========== EXAMPLE 3: Multi-Factor Authentication ==========

/**
 * Complete MFA flow: Password → Physics → Success
 */
export function MultiFactorExample() {
  const [phase, setPhase] = useState<'password' | 'physics' | 'success'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      alert('Please fill in all fields');
      return;
    }

    console.log('[MFA] Password verification passed:', email);
    setPhase('physics');
  };

  const handlePhysicsSuccess = (proof: string) => {
    console.log('[MFA] Physics verification passed with proof:', proof);
    console.log('[MFA] Multi-factor authentication complete for:', email);
    setPhase('success');
  };

  const handlePhysicsFail = () => {
    console.error('[MFA] Physics verification failed');
    alert('Physics verification failed. Please try again.');
  };

  return (
    <div style={{
      maxWidth: '400px',
      margin: '40px auto',
      padding: '30px',
      backgroundColor: 'rgba(0, 20, 40, 0.8)',
      border: '2px solid rgba(0, 255, 100, 0.3)',
      borderRadius: '12px',
      fontFamily: 'monospace',
    }}>
      <h1 style={{ color: '#00ff64', textAlign: 'center', marginBottom: '30px' }}>
        🔐 Multi-Factor Auth
      </h1>

      {phase === 'password' && (
        <form onSubmit={handlePasswordSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: '#00ff64', display: 'block', marginBottom: '5px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: 'rgba(0, 255, 100, 0.05)',
                border: '1px solid rgba(0, 255, 100, 0.3)',
                borderRadius: '4px',
                color: '#00ff64',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#00ff64', display: 'block', marginBottom: '5px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: 'rgba(0, 255, 100, 0.05)',
                border: '1px solid rgba(0, 255, 100, 0.3)',
                borderRadius: '4px',
                color: '#00ff64',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#00ff64',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Step 1: Verify Credentials
          </button>

          <p style={{ color: '#888', fontSize: '12px', marginTop: '15px', textAlign: 'center' }}>
            Demo: Use any email/password
          </p>
        </form>
      )}

      {phase === 'physics' && (
        <div>
          <p style={{ color: '#00ff64', marginBottom: '20px', textAlign: 'center' }}>
            ✅ Credentials verified. Now complete step 2:
          </p>
          <GravityChallenge
            onSuccess={handlePhysicsSuccess}
            onFail={handlePhysicsFail}
          />
        </div>
      )}

      {phase === 'success' && (
        <div style={{
          padding: '20px',
          backgroundColor: 'rgba(0, 255, 100, 0.1)',
          border: '2px solid #00ff64',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <h2 style={{ color: '#00ff64', margin: '0 0 10px 0' }}>
            ✅ FULLY AUTHENTICATED
          </h2>
          <p style={{ color: '#00ff64', margin: '10px 0' }}>
            Multi-factor authentication successful!
          </p>
          <p style={{ color: '#888', fontSize: '12px', margin: '10px 0' }}>
            User: {email}
          </p>
          <button
            onClick={() => {
              setPhase('password');
              setEmail('');
              setPassword('');
            }}
            style={{
              marginTop: '15px',
              padding: '10px 20px',
              backgroundColor: '#00ff64',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Login Again
          </button>
        </div>
      )}
    </div>
  );
}

// ========== EXAMPLE 4: Integration with Backend ==========

/**
 * Full example with backend communication.
 * Shows how to send the physics proof to a server
 * for verification.
 */
export function BackendIntegrationExample() {
  const [state, setState] = useState<'challenge' | 'sending' | 'success' | 'error'>('challenge');
  const [message, setMessage] = useState('');

  const handleSuccess = async (proof: string) => {
    setState('sending');
    setMessage('📤 Sending physics proof to backend...');

    try {
      // In a real app, replace with your actual backend URL
      const response = await fetch('/api/v1/verify-physics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'user@example.com',
          physicsProof: proof,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend verification successful:', data);
        setState('success');
        setMessage('✅ Physics proof verified by backend!');
      } else {
        const error = await response.json();
        console.error('❌ Backend verification failed:', error);
        setState('error');
        setMessage('❌ Backend rejected the physics proof');
      }
    } catch (err) {
      console.error('❌ Network error:', err);
      setState('error');
      setMessage('❌ Failed to reach backend. (In demo mode - this is expected)');
    }
  };

  const handleFail = () => {
    setState('error');
    setMessage('❌ Physics challenge failed - bot behavior detected');
  };

  const reset = () => {
    setState('challenge');
    setMessage('');
  };

  return (
    <div style={{
      maxWidth: '500px',
      margin: '40px auto',
      padding: '30px',
      backgroundColor: 'rgba(0, 20, 40, 0.8)',
      border: '2px solid rgba(0, 255, 100, 0.3)',
      borderRadius: '12px',
    }}>
      <h1 style={{ color: '#00ff64', textAlign: 'center', marginBottom: '10px' }}>
        🔗 Backend Integration
      </h1>
      <p style={{ color: '#888', textAlign: 'center', marginBottom: '30px', fontSize: '12px' }}>
        Physics proof → Backend verification → Access granted
      </p>

      {state === 'challenge' && (
        <GravityChallenge
          onSuccess={handleSuccess}
          onFail={handleFail}
        />
      )}

      {state === 'sending' && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#00ff64',
        }}>
          <div style={{
            fontSize: '32px',
            marginBottom: '15px',
            animation: 'spin 1s linear infinite',
          }}>
            ⟳
          </div>
          <p>{message}</p>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '15px' }}>
            Verifying with backend...
          </p>
        </div>
      )}

      {state === 'success' && (
        <div style={{
          padding: '30px',
          backgroundColor: 'rgba(0, 255, 100, 0.1)',
          border: '2px solid #00ff64',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#00ff64',
        }}>
          <h2 style={{ margin: '0 0 10px 0' }}>✅ VERIFIED</h2>
          <p>{message}</p>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '15px' }}>
            Backend confirmed physics proof is valid
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: '15px',
              padding: '10px 20px',
              backgroundColor: '#00ff64',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {state === 'error' && (
        <div style={{
          padding: '30px',
          backgroundColor: 'rgba(255, 0, 64, 0.1)',
          border: '2px solid #ff0040',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#ff0040',
        }}>
          <h2 style={{ margin: '0 0 10px 0' }}>❌ FAILED</h2>
          <p>{message}</p>
          <button
            onClick={reset}
            style={{
              marginTop: '15px',
              padding: '10px 20px',
              backgroundColor: '#ff0040',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Retry
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ========== EXPORTS ==========

/**
 * All examples exported as a single component
 * that can be toggled through.
 */
export function GravityChallengeExamples() {
  const [selectedExample, setSelectedExample] = useState<1 | 2 | 3 | 4>(1);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        {[1, 2, 3, 4].map((num) => (
          <button
            key={num}
            onClick={() => setSelectedExample(num as 1 | 2 | 3 | 4)}
            style={{
              padding: '10px 15px',
              backgroundColor: selectedExample === num ? '#00ff64' : 'rgba(0, 255, 100, 0.2)',
              color: selectedExample === num ? '#000' : '#00ff64',
              border: `2px solid ${selectedExample === num ? '#00ff64' : 'rgba(0, 255, 100, 0.5)'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontFamily: 'monospace',
            }}
          >
            Example {num}
          </button>
        ))}
      </div>

      {selectedExample === 1 && <MinimalExample />}
      {selectedExample === 2 && <StateManagementExample />}
      {selectedExample === 3 && <MultiFactorExample />}
      {selectedExample === 4 && <BackendIntegrationExample />}
    </div>
  );
}

export default GravityChallengeExamples;
