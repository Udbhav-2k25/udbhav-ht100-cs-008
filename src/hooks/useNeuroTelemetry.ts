import { useEffect, useRef, useCallback } from 'react';

/**
 * Mouse position and movement data point
 */
export interface MousePoint {
  x: number;
  y: number;
  time: number;
  pressure?: number;
}

/**
 * Keystroke dynamics data
 */
export interface KeystrokeDynamics {
  flightTimes: number[]; // Time between keyUp and keyDown (ms)
  dwellTimes: number[]; // Time between keyDown and keyUp (ms)
  keys: string[];
}

/**
 * Complete telemetry data collected by the hook
 */
export interface TelemetryData {
  keystrokeDynamics: KeystrokeDynamics;
  mousePath: MousePoint[];
  entropyScore: number;
  sessionDuration: number;
  timestamp: number;
}

/**
 * useNeuroTelemetry Hook
 * 
 * Tracks behavioral biometrics including keystroke dynamics and mouse physics.
 * Calculates entropy score based on mouse movement patterns.
 */
export const useNeuroTelemetry = () => {
  const telemetryRef = useRef({
    keystrokeDynamics: {
      flightTimes: [] as number[],
      dwellTimes: [] as number[],
      keys: [] as string[],
    },
    mousePath: [] as MousePoint[],
    lastKeyUpTime: 0,
    lastMousePos: { x: 0, y: 0, time: Date.now() },
    keyDownTime: 0,
    sessionStartTime: Date.now(),
  });

  /**
   * Calculate entropy score based on mouse acceleration variance
   * Returns 0-100 where higher values indicate more natural (less robotic) movement
   */
  const calculateEntropyScore = useCallback((): number => {
    const mousePath = telemetryRef.current.mousePath;

    if (mousePath.length < 3) {
      return 50; // Default for insufficient data
    }

    // Calculate acceleration vectors
    const accelerations: number[] = [];

    for (let i = 2; i < mousePath.length; i++) {
      const point1 = mousePath[i - 2];
      const point2 = mousePath[i - 1];
      const point3 = mousePath[i];

      const timeDelta1 = Math.max(point2.time - point1.time, 1);
      const timeDelta2 = Math.max(point3.time - point2.time, 1);

      // Velocity vectors
      const vel1X = (point2.x - point1.x) / timeDelta1;
      const vel1Y = (point2.y - point1.y) / timeDelta1;
      const vel2X = (point3.x - point2.x) / timeDelta2;
      const vel2Y = (point3.y - point2.y) / timeDelta2;

      // Acceleration magnitude
      const accelX = vel2X - vel1X;
      const accelY = vel2Y - vel1Y;
      const accelMagnitude = Math.sqrt(accelX * accelX + accelY * accelY);

      accelerations.push(accelMagnitude);
    }

    if (accelerations.length === 0) {
      return 50;
    }

    // Calculate variance of acceleration
    const mean = accelerations.reduce((a, b) => a + b, 0) / accelerations.length;
    const variance = accelerations.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / accelerations.length;
    const stdDev = Math.sqrt(variance);

    // Normalize: higher std dev (more variation) = more natural
    // Map to 0-100 scale where linear/robotic movement scores lower
    const linearityScore = Math.exp(-stdDev / 50) * 100;
    const entropyScore = 100 - linearityScore;

    return Math.min(100, Math.max(0, entropyScore));
  }, []);

  /**
   * Get current telemetry data
   */
  const getTelemetry = useCallback((): TelemetryData => {
    const sessionDuration = Date.now() - telemetryRef.current.sessionStartTime;
    const entropyScore = calculateEntropyScore();

    return {
      keystrokeDynamics: {
        flightTimes: [...telemetryRef.current.keystrokeDynamics.flightTimes],
        dwellTimes: [...telemetryRef.current.keystrokeDynamics.dwellTimes],
        keys: [...telemetryRef.current.keystrokeDynamics.keys],
      },
      mousePath: [...telemetryRef.current.mousePath],
      entropyScore,
      sessionDuration,
      timestamp: Date.now(),
    };
  }, [calculateEntropyScore]);

  /**
   * Reset all telemetry data
   */
  const resetTelemetry = useCallback((): void => {
    telemetryRef.current = {
      keystrokeDynamics: {
        flightTimes: [],
        dwellTimes: [],
        keys: [],
      },
      mousePath: [],
      lastKeyUpTime: 0,
      lastMousePos: { x: 0, y: 0, time: Date.now() },
      keyDownTime: 0,
      sessionStartTime: Date.now(),
    };
  }, []);

  /**
   * Handle keydown event - track keystroke initiation
   */
  const handleKeyDown = useCallback((event: KeyboardEvent): void => {
    const currentTime = Date.now();
    const lastKeyUp = telemetryRef.current.lastKeyUpTime;

    // Calculate flight time (time between previous keyUp and current keyDown)
    if (lastKeyUp > 0) {
      const flightTime = currentTime - lastKeyUp;
      telemetryRef.current.keystrokeDynamics.flightTimes.push(flightTime);
    }

    // Store key and record keydown time
    telemetryRef.current.keystrokeDynamics.keys.push(event.key);
    telemetryRef.current.keyDownTime = currentTime;
  }, []);

  /**
   * Handle keyup event - track keystroke completion
   */
  const handleKeyUp = useCallback((): void => {
    const currentTime = Date.now();
    const keyDownTime = telemetryRef.current.keyDownTime;

    // Calculate dwell time (time between keyDown and keyUp for this key)
    if (keyDownTime > 0) {
      const dwellTime = currentTime - keyDownTime;
      telemetryRef.current.keystrokeDynamics.dwellTimes.push(dwellTime);
    }

    telemetryRef.current.lastKeyUpTime = currentTime;
  }, []);

  /**
   * Handle mousemove event - track mouse path and physics
   */
  const handleMouseMove = useCallback((event: MouseEvent): void => {
    const currentTime = Date.now();
    
    const mousePoint: MousePoint = {
      x: event.clientX,
      y: event.clientY,
      time: currentTime,
      pressure: (event as any).pressure || undefined,
    };

    telemetryRef.current.mousePath.push(mousePoint);
    telemetryRef.current.lastMousePos = { x: event.clientX, y: event.clientY, time: currentTime };
  }, []);

  /**
   * Set up event listeners on mount
   */
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleKeyDown, handleKeyUp, handleMouseMove]);

  return {
    getTelemetry,
    resetTelemetry,
  };
};
