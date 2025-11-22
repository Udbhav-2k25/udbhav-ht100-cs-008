/**
 * useZeroKnowledgeML Hook
 * "God Mode" - Zero-Knowledge Machine Learning for Advanced Behavioral Authentication
 *
 * Implements:
 * - Local behavioral model training (SHA-256 Behavioral Hash)
 * - Zero-Knowledge Proof generation (JWT-like tokens)
 * - Physics engine integration (entropy scoring)
 * - Client-side learning without sending raw data
 */

import { useState, useCallback, useEffect } from 'react';

// ==================== TYPES ====================

/**
 * User behavioral model stored locally
 */
interface UserBehavioralModel {
  behavioralHash: string; // SHA-256 simulation of typing pattern
  entropyScore: number; // Mouse acceleration variance (0-100)
  trainingTimestamp: number; // When model was created
  trainingDataPoints: number; // How many keystrokes used for training
  toleranceThreshold: number; // Acceptance threshold (0-1)
}

/**
 * Zero-Knowledge Proof token (JWT-like)
 */
interface ZKProofToken {
  sub: string; // Subject (user ID, if available)
  verified: boolean; // Always true if proof is generated
  iat: number; // Issued at (timestamp)
  exp: number; // Expiration (timestamp)
  entropy: number; // Current entropy score
  confidence: number; // Match confidence (0-1)
  signature: string; // Mock signature (SHA-256 hash)
}

/**
 * Hook state for God Mode
 */
interface GodModeState {
  isTraining: boolean;
  entropyScore: number;
  userModel: UserBehavioralModel | null;
  lastProof: ZKProofToken | null;
  trainingProgress: number; // 0-100
  error: string | null;
}

// ==================== CONSTANTS ====================

const STORAGE_KEY = 'neurogate_user_model';
const MIN_TRAINING_SAMPLES = 20; // Minimum keystrokes to train
const PROOF_EXPIRY_SECONDS = 3600; // 1 hour
const DEFAULT_TOLERANCE = 0.15; // 15% variance allowed
const LOCAL_STORAGE_VERSION = 'v1';

// ==================== UTILITY FUNCTIONS ====================

/**
 * Simulate SHA-256 hash for behavioral pattern
 * In production, use crypto library
 */
function simulateSHA256(data: number[]): string {
  let hash = 0;

  // Simple hash simulation
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to hex-like string
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256_${hex}_${Date.now().toString(16)}`;
}

/**
 * Calculate variance of array values
 * Used for entropy and pattern matching
 */
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((value) => Math.pow(value - mean, 2));
  const variance = squareDiffs.reduce((a, b) => a + b, 0) / values.length;

  return Math.sqrt(variance); // Return standard deviation
}

/**
 * Normalize variance to entropy score (0-100)
 */
function normalizeToEntropyScore(variance: number): number {
  // Higher variance = more natural movement = higher entropy
  const normalized = Math.min(variance / 100, 1.0) * 100;
  return Math.round(normalized * 10) / 10;
}

/**
 * Compare two behavioral patterns
 * Returns confidence score (0-1)
 */
function comparePatterns(pattern1: number[], pattern2: number[], _tolerance: number): number {
  if (pattern1.length === 0 || pattern2.length === 0) return 0;

  // Normalize both patterns to same length
  const len = Math.min(pattern1.length, pattern2.length);
  let totalDiff = 0;

  for (let i = 0; i < len; i++) {
    const diff = Math.abs(pattern1[i] - pattern2[i]);
    totalDiff += diff;
  }

  const avgDiff = totalDiff / len;
  const avgValue = (pattern1.reduce((a, b) => a + b, 0) / pattern1.length +
    pattern2.reduce((a, b) => a + b, 0) / pattern2.length) / 2;

  // Calculate deviation percentage
  const deviationPercent = avgValue > 0 ? avgDiff / avgValue : 0;
  const confidence = Math.max(0, 1 - deviationPercent);

  return confidence;
}

/**
 * Generate JWT-like ZK proof token
 * No raw data included, only verification flag
 */
function generateZKProofToken(
  userID: string,
  confidence: number,
  entropyScore: number
): ZKProofToken {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + PROOF_EXPIRY_SECONDS;

  // Create signature from components
  const signatureSource = `${userID}:${now}:${confidence}:true`;
  const signature = simulateSHA256(
    signatureSource.split('').map((c) => c.charCodeAt(0))
  );

  return {
    sub: userID,
    verified: true,
    iat: now,
    exp: exp,
    entropy: entropyScore,
    confidence: Math.round(confidence * 100) / 100,
    signature: signature,
  };
}

/**
 * Encode ZK Proof Token to JWT-like string
 */
function encodeZKProof(token: ZKProofToken): string {
  const header = btoa(JSON.stringify({ alg: 'SHA256', typ: 'ZK' }));
  const payload = btoa(JSON.stringify(token));
  const signature = token.signature.split('_')[1] || '0000000000';

  return `${header}.${payload}.${signature}`;
}

/**
 * Persist user model to localStorage
 */
function saveUserModel(model: UserBehavioralModel): void {
  try {
    const data = {
      version: LOCAL_STORAGE_VERSION,
      model: model,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[useZeroKnowledgeML] Error saving model:', error);
  }
}

/**
 * Retrieve user model from localStorage
 */
function loadUserModel(): UserBehavioralModel | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;

    const parsed = JSON.parse(data);
    if (parsed.version !== LOCAL_STORAGE_VERSION) {
      console.warn('[useZeroKnowledgeML] Model version mismatch, ignoring');
      return null;
    }

    return parsed.model;
  } catch (error) {
    console.error('[useZeroKnowledgeML] Error loading model:', error);
    return null;
  }
}

// ==================== HOOK IMPLEMENTATION ====================

export const useZeroKnowledgeML = (userID: string = 'guest') => {
  // State management
  const [state, setState] = useState<GodModeState>({
    isTraining: false,
    entropyScore: 0,
    userModel: null,
    lastProof: null,
    trainingProgress: 0,
    error: null,
  });

  // Training data accumulator (not persisted between sessions)
  const [trainingBuffer, setTrainingBuffer] = useState<number[]>([]);

  // ==================== INITIALIZATION ====================

  useEffect(() => {
    // Load existing model on mount
    const storedModel = loadUserModel();
    if (storedModel) {
      console.log('[useZeroKnowledgeML] ✅ Loaded user model from localStorage');
      setState((prev) => ({
        ...prev,
        userModel: storedModel,
        entropyScore: storedModel.entropyScore,
      }));
    } else {
      console.log('[useZeroKnowledgeML] ℹ️ No existing model found. Ready for training.');
    }
  }, []);

  // ==================== TRAINING FUNCTION ====================

  /**
   * Train local model with keystroke patterns
   * Converts keystrokes to behavioral hash and stores as User Model
   *
   * @param keystrokes - Array of keystroke timings (flight/dwell times in ms)
   * @returns Success boolean
   */
  const trainLocalModel = useCallback(
    (keystrokes: number[]): boolean => {
      if (!Array.isArray(keystrokes) || keystrokes.length === 0) {
        const error = 'Invalid keystrokes: must be non-empty array';
        console.error(`[useZeroKnowledgeML] ❌ ${error}`);
        setState((prev) => ({ ...prev, error }));
        return false;
      }

      console.log(
        `[useZeroKnowledgeML] 🎓 Training with ${keystrokes.length} keystroke samples...`
      );
      setState((prev) => ({ ...prev, isTraining: true, error: null }));

      // Accumulate training data
      const newBuffer = [...trainingBuffer, ...keystrokes];
      setTrainingBuffer(newBuffer);

      // Calculate progress
      const progress = Math.min((newBuffer.length / MIN_TRAINING_SAMPLES) * 100, 100);
      setState((prev) => ({ ...prev, trainingProgress: progress }));

      // Check if we have enough samples
      if (newBuffer.length < MIN_TRAINING_SAMPLES) {
        console.log(
          `[useZeroKnowledgeML] ℹ️ Training progress: ${newBuffer.length}/${MIN_TRAINING_SAMPLES} samples`
        );
        setState((prev) => ({ ...prev, isTraining: true }));
        return false;
      }

      // Calculate behavioral hash
      const behavioralHash = simulateSHA256(newBuffer);
      console.log(`[useZeroKnowledgeML] 🔐 Generated Behavioral Hash: ${behavioralHash}`);

      // Calculate entropy from variance
      const variance = calculateVariance(newBuffer);
      const entropyScore = normalizeToEntropyScore(variance);
      console.log(
        `[useZeroKnowledgeML] 📊 Entropy Score: ${entropyScore}/100 (variance: ${variance.toFixed(2)})`
      );

      // Create user model
      const userModel: UserBehavioralModel = {
        behavioralHash,
        entropyScore,
        trainingTimestamp: Date.now(),
        trainingDataPoints: newBuffer.length,
        toleranceThreshold: DEFAULT_TOLERANCE,
      };

      // Save model
      saveUserModel(userModel);
      console.log(
        `[useZeroKnowledgeML] ✅ Training complete! Model saved with ${newBuffer.length} data points`
      );

      // Update state
      setState((prev) => ({
        ...prev,
        isTraining: false,
        userModel,
        entropyScore,
        trainingProgress: 100,
      }));

      // Clear buffer
      setTrainingBuffer([]);

      return true;
    },
    [trainingBuffer]
  );

  // ==================== PROOF GENERATION ====================

  /**
   * Generate Zero-Knowledge Proof
   * Compares current session data to stored User Model
   * Returns JWT-like token with verification flag (NO raw data)
   *
   * @param currentSessionData - Current keystroke/behavioral data
   * @returns ZK Proof token and encoded JWT string
   */
  const generateProof = useCallback(
    (currentSessionData: number[]): { token: ZKProofToken | null; encoded: string | null } => {
      if (!state.userModel) {
        const error = 'No user model trained. Call trainLocalModel() first.';
        console.error(`[useZeroKnowledgeML] ❌ ${error}`);
        setState((prev) => ({ ...prev, error }));
        return { token: null, encoded: null };
      }

      if (!Array.isArray(currentSessionData) || currentSessionData.length === 0) {
        const error = 'Invalid session data: must be non-empty array';
        console.error(`[useZeroKnowledgeML] ❌ ${error}`);
        setState((prev) => ({ ...prev, error }));
        return { token: null, encoded: null };
      }

      console.log('[useZeroKnowledgeML] 🔑 Generating Zero-Knowledge Proof...');

      // Extract pattern from current session (use first N values matching training length)
      const modelDataLength = state.userModel.trainingDataPoints;
      const currentPattern = currentSessionData.slice(0, Math.min(modelDataLength, currentSessionData.length));

      // Reconstruct model pattern from hash (simulation - in real use, store pattern separately)
      // For now, use a simple hash comparison approach
      const currentSessionHash = simulateSHA256(currentPattern);
      console.log(`[useZeroKnowledgeML] 📋 Current session hash: ${currentSessionHash}`);

      // Compare patterns
      const confidence = comparePatterns(
        // Note: We're comparing hashes as numbers for demo
        state.userModel.behavioralHash.split('').map((c) => c.charCodeAt(0)),
        currentSessionHash.split('').map((c) => c.charCodeAt(0)),
        state.userModel.toleranceThreshold
      );

      const isMatch = confidence >= 1 - state.userModel.toleranceThreshold;

      if (isMatch) {
        console.log(
          `[useZeroKnowledgeML] ✅ Pattern match confirmed (confidence: ${(confidence * 100).toFixed(1)}%)`
        );
      } else {
        console.log(
          `[useZeroKnowledgeML] ⚠️ Pattern mismatch (confidence: ${(confidence * 100).toFixed(1)}%)`
        );
      }

      // Generate proof token (only if match)
      if (isMatch) {
        const token = generateZKProofToken(userID, confidence, state.entropyScore);
        const encoded = encodeZKProof(token);

        console.log('[useZeroKnowledgeML] 🎖️ Zero-Knowledge Proof generated (no raw data included)');
        console.log(`[useZeroKnowledgeML] 📜 Proof expires at: ${new Date(token.exp * 1000).toLocaleString()}`);

        setState((prev) => ({ ...prev, lastProof: token }));

        return { token, encoded };
      } else {
        const error = 'Pattern does not match trained model';
        console.warn(`[useZeroKnowledgeML] ⚠️ ${error}`);
        setState((prev) => ({ ...prev, error }));
        return { token: null, encoded: null };
      }
    },
    [state.userModel, state.entropyScore, userID]
  );

  // ==================== PHYSICS ENGINE INTEGRATION ====================

  /**
   * Update entropy score from mouse acceleration data
   * Physics-based calculation of movement naturalness
   */
  const updateEntropyFromMouseData = useCallback((mouseAccelerations: number[]): void => {
    if (!Array.isArray(mouseAccelerations) || mouseAccelerations.length === 0) {
      return;
    }

    const variance = calculateVariance(mouseAccelerations);
    const newEntropyScore = normalizeToEntropyScore(variance);

    console.log(
      `[useZeroKnowledgeML] 📊 Physics Engine - Updated entropy: ${newEntropyScore}/100`
    );

    setState((prev) => ({
      ...prev,
      entropyScore: newEntropyScore,
    }));
  }, []);

  // ==================== MODEL RESET ====================

  /**
   * Reset user model and clear training data
   * Starts fresh training session
   */
  const resetModel = useCallback((): void => {
    console.log('[useZeroKnowledgeML] 🔄 Resetting user model...');

    try {
      localStorage.removeItem(STORAGE_KEY);
      setTrainingBuffer([]);
      setState({
        isTraining: false,
        entropyScore: 0,
        userModel: null,
        lastProof: null,
        trainingProgress: 0,
        error: null,
      });

      console.log('[useZeroKnowledgeML] ✅ Model reset complete');
    } catch (error) {
      console.error('[useZeroKnowledgeML] ❌ Error resetting model:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to reset model',
      }));
    }
  }, []);

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Get current model info
   */
  const getModelInfo = useCallback(() => {
    if (!state.userModel) return null;

    return {
      trained: true,
      dataPoints: state.userModel.trainingDataPoints,
      entropyScore: state.userModel.entropyScore,
      age: Date.now() - state.userModel.trainingTimestamp,
      tolerance: state.userModel.toleranceThreshold,
    };
  }, [state.userModel]);

  /**
   * Get current proof info
   */
  const getProofInfo = useCallback(() => {
    if (!state.lastProof) return null;

    return {
      verified: state.lastProof.verified,
      confidence: state.lastProof.confidence,
      entropy: state.lastProof.entropy,
      issuedAt: new Date(state.lastProof.iat * 1000),
      expiresAt: new Date(state.lastProof.exp * 1000),
      isExpired: Date.now() / 1000 > state.lastProof.exp,
    };
  }, [state.lastProof]);

  // ==================== RETURN HOOK INTERFACE ====================

  return {
    // State
    isTraining: state.isTraining,
    entropyScore: state.entropyScore,
    trainingProgress: state.trainingProgress,
    error: state.error,
    userModel: state.userModel,
    lastProof: state.lastProof,

    // Training & Proof
    trainLocalModel,
    generateProof,
    updateEntropyFromMouseData,
    resetModel,

    // Utilities
    getModelInfo,
    getProofInfo,
  };
};

export type { UserBehavioralModel, ZKProofToken, GodModeState };
