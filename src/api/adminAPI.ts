/**
 * NeuroGate Admin API Client
 * Handles all admin dashboard communications with the backend
 */

import axios from 'axios';
import type { AxiosInstance } from 'axios';

// ==================== DATA STRUCTURES ====================

/**
 * SecurityEvent represents a single login attempt logged by the backend
 */
export interface SecurityEvent {
  id: string;
  timestamp: number;
  userId: string;
  ip: string;
  trustScore: number;
  status: 'success' | 'challenged' | 'blocked';
  time: string; // Human-readable timestamp (e.g., "2025-11-22 14:30:45")
}

/**
 * EventListResponse is the API response from /api/v1/admin/events
 */
export interface EventListResponse {
  events: SecurityEvent[];
  count: number;
}

/**
 * DashboardStats calculated from security events
 */
export interface DashboardStats {
  totalLogins: number;
  averageTrustScore: number;
  threatsBlocked: number;
  successRate: number;
}

// ==================== ADMIN API CLIENT ====================

class AdminAPI {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:3000') {
    this.baseURL = baseURL;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Request interceptor with logging
    this.client.interceptors.request.use(
      (config) => {
        console.log('[AdminAPI] Request:', config.method?.toUpperCase(), config.url);
        return config;
      },
      (error: unknown) => {
        console.error('[AdminAPI] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor with logging
    this.client.interceptors.response.use(
      (response) => {
        console.log('[AdminAPI] Response:', response.status, response.data);
        return response;
      },
      (error: unknown) => {
        console.error('[AdminAPI] Response error:', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Fetch security events from the backend
   * @returns Promise containing array of SecurityEvent objects
   * @throws Error if the API request fails
   */
  async fetchSecurityEvents(): Promise<SecurityEvent[]> {
    try {
      const response = await this.client.get<EventListResponse>('/api/v1/admin/events');
      console.log(`[AdminAPI] ✅ Fetched ${response.data.count} security events`);
      return response.data.events;
    } catch (error) {
      console.error('[AdminAPI] ❌ Failed to fetch security events:', error);
      throw error;
    }
  }

  /**
   * Calculate dashboard statistics from security events
   * @param events Array of SecurityEvent objects
   * @returns DashboardStats object with computed metrics
   */
  calculateStats(events: SecurityEvent[]): DashboardStats {
    if (events.length === 0) {
      return {
        totalLogins: 0,
        averageTrustScore: 0,
        threatsBlocked: 0,
        successRate: 0,
      };
    }

    const totalLogins = events.length;
    const threatsBlocked = events.filter((e) => e.status === 'blocked' || e.status === 'challenged').length;
    const successCount = events.filter((e) => e.status === 'success').length;
    const averageTrustScore =
      events.reduce((sum, e) => sum + e.trustScore, 0) / totalLogins;
    const successRate = (successCount / totalLogins) * 100;

    return {
      totalLogins,
      averageTrustScore: Math.round(averageTrustScore * 100) / 100,
      threatsBlocked,
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  /**
   * Get the status color based on trust score
   * Used for visual coding in the dashboard
   */
  getStatusColor(trustScore: number): string {
    if (trustScore >= 70) return '#4CAF50'; // Green - safe
    if (trustScore >= 40) return '#FFC107'; // Yellow - warning
    return '#F44336'; // Red - threat
  }

  /**
   * Get the status label based on trust score
   */
  getStatusLabel(trustScore: number): string {
    if (trustScore >= 70) return 'SAFE';
    if (trustScore >= 40) return 'CAUTION';
    return 'THREAT';
  }

  /**
   * Format a Unix timestamp to a readable date string
   */
  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  }
}

// ==================== SINGLETON INSTANCE ====================

// Create and export a singleton instance
const adminAPI = new AdminAPI(
  import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3000'
);

export default adminAPI;
