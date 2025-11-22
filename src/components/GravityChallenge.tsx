import React, { useState, useRef, useCallback, useEffect } from 'react';

// ========== TYPES ==========

interface MovementPoint {
  timestamp: number;
  x: number;
  y: number;
}

interface PhysicsAnalysis {
  isHuman: boolean;
  confidence: number;
  reasons: string[];
  velocities: number[];
  accelerations: number[];
}

interface GravityChallengeProps {
  onSuccess: (proof: string) => void;
  onFail: () => void;
}

// ========== CONSTANTS ==========

const LERP_FACTOR = 0.15; // Lag effect (0-1, lower = more lag)
const MIN_MOVEMENT_TIME = 50; // ms - minimum realistic movement
const VELOCITY_THRESHOLD = 500; // px/ms - suspiciously fast
const LINEARITY_THRESHOLD = 0.95; // 0-1 - how linear is "too linear"
const MIN_SAMPLES = 15; // Minimum movement samples
const SLIDER_WIDTH = 300;
const SLIDER_HEIGHT = 60;
const HANDLE_SIZE = 50;

// ========== PHYSICS UTILS ==========

/**
 * Calculate distance between two points
 */
function distance(p1: MovementPoint, p2: MovementPoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate velocity between two points (px/ms)
 */
function calculateVelocity(p1: MovementPoint, p2: MovementPoint): number {
  const timeDiff = p2.timestamp - p1.timestamp;
  if (timeDiff === 0) return Infinity;
  const dist = distance(p1, p2);
  return dist / timeDiff;
}

/**
 * Calculate acceleration between velocity changes
 */
function calculateAccelerations(velocities: number[]): number[] {
  const accelerations: number[] = [];
  for (let i = 1; i < velocities.length; i++) {
    // Acceleration = change in velocity
    accelerations.push(Math.abs(velocities[i] - velocities[i - 1]));
  }
  return accelerations;
}

/**
 * Measure linearity of movement (0 = chaotic, 1 = perfectly linear)
 * Uses least-squares linear regression fit coefficient
 */
function measureLinearity(points: MovementPoint[]): number {
  if (points.length < 3) return 0;

  // Convert to relative coordinates (origin at first point)
  const relPoints = points.map((p, i) => ({
    t: i,
    x: p.x,
    y: p.y,
  }));

  // Calculate mean
  const meanT = relPoints.reduce((sum, p) => sum + p.t, 0) / relPoints.length;
  const meanX = relPoints.reduce((sum, p) => sum + p.x, 0) / relPoints.length;

  // Calculate R-squared for x position vs time
  let ssRes = 0; // Sum of squares of residuals
  let ssTot = 0; // Total sum of squares

  for (const p of relPoints) {
    const predicted = meanX + ((p.t - meanT) / (relPoints.length - 1)) * (relPoints[relPoints.length - 1].x - relPoints[0].x);
    const actual = p.x;
    const residual = actual - predicted;

    ssRes += residual * residual;
    ssTot += (actual - meanX) * (actual - meanX);
  }

  if (ssTot === 0) return 1; // All points same x - perfectly linear
  const rSquared = 1 - ssRes / ssTot;
  return Math.max(0, Math.min(1, rSquared)); // Clamp to 0-1
}

/**
 * Comprehensive physics analysis for human vs bot detection
 */
function analyzePhysics(points: MovementPoint[]): PhysicsAnalysis {
  const reasons: string[] = [];
  let confidence = 0.5; // Start neutral

  if (points.length < MIN_SAMPLES) {
    return {
      isHuman: false,
      confidence: 0,
      reasons: [`Insufficient movement samples: ${points.length}/${MIN_SAMPLES}`],
      velocities: [],
      accelerations: [],
    };
  }

  // ========== CHECK 1: Instant Movement (BOT Signature) ==========
  const firstTwo = points.slice(0, 2);
  if (firstTwo.length === 2) {
    const timeDiff = firstTwo[1].timestamp - firstTwo[0].timestamp;
    if (timeDiff === 0) {
      reasons.push('Instant movement detected (0ms gap) - BOT signature');
      confidence -= 0.3;
    } else if (timeDiff < MIN_MOVEMENT_TIME) {
      reasons.push(`Suspiciously fast initial movement (${timeDiff}ms)`);
      confidence -= 0.2;
    } else {
      reasons.push(`Natural movement onset (${timeDiff}ms)`);
      confidence += 0.1;
    }
  }

  // ========== CHECK 2: Velocity Analysis ==========
  const velocities: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const vel = calculateVelocity(points[i - 1], points[i]);
    if (isFinite(vel)) velocities.push(vel);
  }

  const maxVelocity = Math.max(...velocities);
  const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;

  if (maxVelocity > VELOCITY_THRESHOLD) {
    reasons.push(`⚠️ Suspiciously high velocity: ${maxVelocity.toFixed(1)} px/ms`);
    confidence -= 0.25;
  } else {
    reasons.push(`✅ Natural velocity range: ${avgVelocity.toFixed(1)} px/ms avg`);
    confidence += 0.1;
  }

  // ========== CHECK 3: Linearity (Constant Velocity = BOT) ==========
  const linearity = measureLinearity(points);

  if (linearity > LINEARITY_THRESHOLD) {
    reasons.push(`⚠️ Movement too linear (${(linearity * 100).toFixed(1)}%) - Constant velocity detected`);
    confidence -= 0.3;
  } else if (linearity > 0.7) {
    reasons.push(`⚠️ Somewhat linear movement (${(linearity * 100).toFixed(1)}%)`);
    confidence -= 0.1;
  } else {
    reasons.push(`✅ Natural acceleration variations (${(linearity * 100).toFixed(1)}% linear)`);
    confidence += 0.2;
  }

  // ========== CHECK 4: Acceleration Variance (Human Sign) ==========
  const accelerations = calculateAccelerations(velocities);

  if (accelerations.length > 0) {
    const avgAccel = accelerations.reduce((a, b) => a + b, 0) / accelerations.length;
    const accelVariance =
      accelerations.reduce((sum, a) => sum + Math.pow(a - avgAccel, 2), 0) / accelerations.length;
    const accelStdDev = Math.sqrt(accelVariance);

    if (accelStdDev > 0.05) {
      reasons.push(`✅ Natural acceleration noise detected (σ=${accelStdDev.toFixed(3)})`);
      confidence += 0.2;
    } else if (accelStdDev > 0.01) {
      reasons.push(`✅ Some acceleration variation (σ=${accelStdDev.toFixed(3)})`);
      confidence += 0.1;
    } else {
      reasons.push(`⚠️ Suspiciously smooth acceleration (σ=${accelStdDev.toFixed(3)})`);
      confidence -= 0.15;
    }
  }

  // ========== CHECK 5: Direction Changes (Human Sign) ==========
  const points3D = points.map((p, i) => ({ ...p, i }));
  let directionChanges = 0;

  for (let i = 1; i < points3D.length - 1; i++) {
    const p1 = points3D[i - 1];
    const p2 = points3D[i];
    const p3 = points3D[i + 1];

    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    // Dot product of normalized vectors
    const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (len1 > 0 && len2 > 0) {
      const dot = (v1.x * v2.x + v1.y * v2.y) / (len1 * len2);
      if (dot < 0.95) {
        // Not parallel - direction changed
        directionChanges++;
      }
    }
  }

  if (directionChanges > points.length * 0.2) {
    reasons.push(`✅ Natural direction adjustments detected (${directionChanges} changes)`);
    confidence += 0.15;
  }

  // ========== FINAL VERDICT ==========
  const isHuman = confidence > 0.4;

  if (isHuman) {
    reasons.push(`✅ HUMAN DETECTED (confidence: ${(confidence * 100).toFixed(1)}%)`);
  } else {
    reasons.push(`❌ BOT SUSPECTED (confidence: ${(confidence * 100).toFixed(1)}%)`);
  }

  // Clamp confidence to 0-1
  const finalConfidence = Math.max(0, Math.min(1, confidence));

  return {
    isHuman,
    confidence: finalConfidence,
    reasons,
    velocities,
    accelerations,
  };
}

/**
 * Generate physics proof token (JWT-like)
 */
function generatePhysicsProof(analysis: PhysicsAnalysis): string {
  const payload = {
    sub: 'gravity_challenge',
    verified: analysis.isHuman,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    confidence: analysis.confidence,
    reason: analysis.reasons[analysis.reasons.length - 1],
    type: 'physics_proof',
  };

  // Create JWT-like token (simplified)
  const encoded = btoa(JSON.stringify(payload));
  return `physics.${encoded}.signature`;
}

// ========== COMPONENT ==========

export const GravityChallenge: React.FC<GravityChallengeProps> = ({ onSuccess, onFail }) => {
  const [sliderValue, setSliderValue] = useState(0); // 0-100
  const [handlePosition, setHandlePosition] = useState(0); // Actual position with LERP
  const [status, setStatus] = useState<'idle' | 'success' | 'fail'>('idle');
  const [message, setMessage] = useState('Slide to verify humanity');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Refs
  const sliderRef = useRef<HTMLDivElement>(null);
  const movementHistoryRef = useRef<MovementPoint[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastHandleRef = useRef(0);

  // ========== LERP ANIMATION ==========
  /**
   * Smooth animation loop using LERP for "weighted" feel
   */
  const animateHandle = useCallback(() => {
    const targetPosition = (sliderValue / 100) * (SLIDER_WIDTH - HANDLE_SIZE);
    const current = lastHandleRef.current;
    const newPosition = current + (targetPosition - current) * LERP_FACTOR;

    setHandlePosition(newPosition);
    lastHandleRef.current = newPosition;

    if (Math.abs(newPosition - targetPosition) > 0.5) {
      animationFrameRef.current = requestAnimationFrame(animateHandle);
    }
  }, [sliderValue]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animateHandle);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animateHandle]);

  // ========== MOUSE TRACKING ==========
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (sliderRef.current && status === 'idle') {
        const rect = sliderRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Record movement
        movementHistoryRef.current.push({
          timestamp: Date.now(),
          x,
          y,
        });

        // Keep only last 100 points
        if (movementHistoryRef.current.length > 100) {
          movementHistoryRef.current.shift();
        }

        // Update slider value based on x position
        const percent = Math.max(0, Math.min(100, (x / SLIDER_WIDTH) * 100));
        setSliderValue(percent);

        // Show progress
        if (percent > 20) {
          setMessage('Analyzing movement...');
        }
        if (percent > 50) {
          setMessage('Keep moving naturally...');
        }
        if (percent > 80) {
          setMessage('Almost there...');
        }
      }
    },
    [status]
  );

  const handleMouseLeave = useCallback(() => {
    if (status === 'idle' && sliderValue < 90) {
      // Reset if user leaves before completing
      setSliderValue(0);
      setMessage('Slide to verify humanity');
    }
  }, [status, sliderValue]);

  // ========== COMPLETION HANDLER ==========
  const handleComplete = useCallback(async () => {
    if (sliderValue < 90) return; // Must slide to ~90%

    setIsAnalyzing(true);
    setMessage('Analyzing physics...');

    // Analyze movement
    const analysis = analyzePhysics(movementHistoryRef.current);

    // Log for debugging
    console.log('[GravityChallenge] Physics Analysis:', analysis);

    // Simulate analysis time
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (analysis.isHuman) {
      // Generate proof
      const proof = generatePhysicsProof(analysis);

      setStatus('success');
      setMessage(`✅ HUMAN VERIFIED (${(analysis.confidence * 100).toFixed(0)}% confidence)`);
      console.log('[GravityChallenge] Proof:', proof);

      // Call success callback
      setTimeout(() => {
        onSuccess(proof);
      }, 500);
    } else {
      // Bot detected
      setStatus('fail');
      setMessage(`❌ BOT DETECTED (${(analysis.confidence * 100).toFixed(0)}% suspicion)`);
      console.error('[GravityChallenge] Bot signature detected:', analysis.reasons);

      // Call fail callback
      setTimeout(() => {
        onFail();
        // Reset
        setSliderValue(0);
        setStatus('idle');
        setMessage('Slide to verify humanity');
        movementHistoryRef.current = [];
      }, 1500);
    }

    setIsAnalyzing(false);
  }, [sliderValue, onSuccess, onFail]);

  // Trigger completion when slider reaches ~90%
  useEffect(() => {
    if (sliderValue > 90 && status === 'idle' && !isAnalyzing) {
      handleComplete();
    }
  }, [sliderValue, status, isAnalyzing, handleComplete]);

  // ========== STYLES ==========
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '16px',
      padding: '24px',
      backgroundColor: 'rgba(0, 20, 40, 0.8)',
      border: '2px solid rgba(0, 255, 100, 0.3)',
      borderRadius: '12px',
      boxShadow: '0 0 20px rgba(0, 255, 100, 0.1)',
    },
    label: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#00ff64',
      textTransform: 'uppercase' as const,
      letterSpacing: '2px',
      textShadow: '0 0 10px rgba(0, 255, 100, 0.5)',
    },
    sliderContainer: {
      position: 'relative' as const,
      width: `${SLIDER_WIDTH}px`,
      height: `${SLIDER_HEIGHT}px`,
      backgroundColor: 'rgba(0, 10, 20, 0.9)',
      border: `2px solid ${status === 'success' ? '#00ff64' : status === 'fail' ? '#ff0040' : 'rgba(0, 255, 100, 0.3)'}`,
      borderRadius: '8px',
      overflow: 'hidden',
      transition: 'border-color 0.3s ease',
      boxShadow:
        status === 'success'
          ? '0 0 20px rgba(0, 255, 100, 0.6), inset 0 0 20px rgba(0, 255, 100, 0.2)'
          : status === 'fail'
            ? '0 0 20px rgba(255, 0, 64, 0.6), inset 0 0 20px rgba(255, 0, 64, 0.2)'
            : '0 0 10px rgba(0, 255, 100, 0.2)',
    },
    fillBar: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: `${sliderValue}%`,
      height: '100%',
      backgroundColor: status === 'fail' ? 'rgba(255, 0, 64, 0.3)' : 'rgba(0, 255, 100, 0.2)',
      transition: 'background-color 0.2s ease',
      pointerEvents: 'none' as const,
    },
    handle: {
      position: 'absolute' as const,
      top: `${(SLIDER_HEIGHT - HANDLE_SIZE) / 2}px`,
      left: `${handlePosition}px`,
      width: `${HANDLE_SIZE}px`,
      height: `${HANDLE_SIZE}px`,
      backgroundColor:
        status === 'success'
          ? '#00ff64'
          : status === 'fail'
            ? '#ff0040'
            : 'rgba(0, 255, 100, 0.6)',
      border: `2px solid ${status === 'success' ? '#00ff64' : status === 'fail' ? '#ff0040' : 'rgba(0, 255, 100, 0.8)'}`,
      borderRadius: '6px',
      cursor: 'grab',
      display: 'flex',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      fontSize: '20px',
      fontWeight: 700,
      color: '#000814',
      boxShadow:
        status === 'success'
          ? '0 0 15px rgba(0, 255, 100, 0.8)'
          : status === 'fail'
            ? '0 0 15px rgba(255, 0, 64, 0.8)'
            : '0 0 10px rgba(0, 255, 100, 0.6)',
      transition: 'all 0.1s ease-out',
      userSelect: 'none' as const,
    },
    sliderTrack: {
      position: 'absolute' as const,
      top: `${SLIDER_HEIGHT / 2 - 2}px`,
      left: 0,
      width: '100%',
      height: '4px',
      backgroundColor: 'rgba(0, 255, 100, 0.1)',
      pointerEvents: 'none' as const,
    },
    message: {
      fontSize: '13px',
      color: status === 'success' ? '#00ff64' : status === 'fail' ? '#ff0040' : '#00ff64',
      textAlign: 'center' as const,
      minHeight: '20px',
      fontFamily: 'monospace',
      textShadow:
        status === 'success' || status === 'fail'
          ? `0 0 10px ${status === 'success' ? 'rgba(0, 255, 100, 0.6)' : 'rgba(255, 0, 64, 0.6)'}`
          : 'none',
      animation:
        status === 'fail'
          ? 'glitch 0.3s ease-in-out'
          : status === 'success'
            ? 'glow 0.5s ease-in-out'
            : 'none',
    },
  };

  return (
    <>
      <style>{`
        @keyframes glow {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        
        @keyframes glitch {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-2px); }
          40% { transform: translateX(2px); }
          60% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
        }
      `}</style>

      <div style={styles.container}>
        <div style={styles.label}>🔐 Verify Humanity</div>

        <div
          ref={sliderRef}
          style={styles.sliderContainer}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div style={styles.fillBar} />
          <div style={styles.sliderTrack} />

          <div style={styles.handle}>
            {status === 'idle' ? '→' : status === 'success' ? '✓' : '✕'}
          </div>
        </div>

        <div style={styles.message}>{message}</div>

        {isAnalyzing && (
          <div
            style={{
              fontSize: '12px',
              color: '#00ff64',
              animation: 'glow 0.5s ease-in-out infinite',
            }}
          >
            ⟳ Analyzing...
          </div>
        )}
      </div>
    </>
  );
};

export default GravityChallenge;
