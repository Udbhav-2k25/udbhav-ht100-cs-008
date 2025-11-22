import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import type { TelemetryData } from '../hooks/useNeuroTelemetry';

/**
 * API response from the biometrics verification endpoint
 */
export interface RiskResponse {
  trustScore: number;
  requiresChallenge: boolean;
}

/**
 * Challenge submission response
 */
export interface ChallengeResponse {
  status: 'accepted' | 'rejected';
  message?: string;
}

/**
 * API error response
 */
export interface ApiError {
  code: string;
  message: string;
}

/**
 * Behavioral Biometrics API Client
 * 
 * Communicates with the Go Gateway at http://localhost:3000/api/v1
 */
class NeuroGateAPI {
  private client: AxiosInstance;
  private readonly baseURL = 'http://localhost:3000/api/v1';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging/debugging
    this.client.interceptors.request.use(
      (config): any => {
        console.debug(`[NeuroGate API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error: unknown) => {
        console.error('[NeuroGate API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response: any) => {
        console.debug(`[NeuroGate API] Response ${response.status}:`, response.data);
        return response;
      },
      (error: AxiosError<ApiError>) => {
        const message = error.response?.data?.message || error.message || 'Unknown error';
        console.error('[NeuroGate API] Response error:', message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Verify user behavior against behavioral profile
   * 
   * @param userId - Unique user identifier
   * @param data - Telemetry data collected from user session
   * @returns RiskResponse with trustScore and challenge requirement
   * @throws AxiosError if the request fails
   */
  async verifyBehavior(userId: string, data: TelemetryData): Promise<RiskResponse> {
    try {
      const response = await this.client.post<RiskResponse>(
        '/verify',
        {
          userId,
          telemetry: {
            keystrokeDynamics: data.keystrokeDynamics,
            mousePath: data.mousePath,
            entropyScore: data.entropyScore,
            sessionDuration: data.sessionDuration,
          },
          timestamp: data.timestamp,
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw this.handleAxiosError(error, 'verifyBehavior');
      }
      throw error;
    }
  }

  /**
   * Submit the result of a physics-based challenge
   * 
   * @param userId - Unique user identifier
   * @param success - Whether the user successfully completed the challenge
   * @returns ChallengeResponse with status and optional message
   * @throws AxiosError if the request fails
   */
  async submitChallenge(userId: string, success: boolean): Promise<ChallengeResponse> {
    try {
      const response = await this.client.post<ChallengeResponse>(
        '/challenge/submit',
        {
          userId,
          success,
          timestamp: Date.now(),
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw this.handleAxiosError(error, 'submitChallenge');
      }
      throw error;
    }
  }

  /**
   * Internal error handler for axios errors
   */
  private handleAxiosError(error: AxiosError<ApiError>, context: string): Error {
    const status = error.response?.status;
    const errorData = error.response?.data;
    const message = errorData?.message || error.message;

    console.error(`[NeuroGate API] Error in ${context} (${status}):`, message);

    const err = new Error(message);
    (err as any).code = errorData?.code || `HTTP_${status}`;
    (err as any).status = status;
    (err as any).data = errorData;

    return err;
  }

  /**
   * Health check endpoint to verify API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Set a custom base URL (useful for switching between environments)
   */
  setBaseURL(url: string): void {
    this.client.defaults.baseURL = url;
  }

  /**
   * Set custom headers (e.g., for authorization tokens)
   */
  setHeaders(headers: Record<string, string>): void {
    Object.assign(this.client.defaults.headers.common, headers);
  }
}

/**
 * Singleton instance of the NeuroGate API client
 */
export const neuroGateAPI = new NeuroGateAPI();

/**
 * Export the class for advanced usage (instantiating multiple clients)
 */
export default NeuroGateAPI;
