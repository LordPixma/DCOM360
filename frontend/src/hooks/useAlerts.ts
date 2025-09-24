import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_API_BASE || 
  (typeof window !== 'undefined' && (
    window.location.hostname === 'flare360-frontend.pages.dev' ||
    window.location.hostname === 'dcom360-frontend.pages.dev' ||
    window.location.hostname === 'flare360.org' ||
    window.location.hostname === 'alerts.flare360.org'
  )) ? 'https://flare360-worker.samuelo-az.workers.dev' : 'http://127.0.0.1:8787';

// Types
export interface AlertSubscription {
  id?: number;
  user_id: string;
  name: string;
  country_filter?: string;
  disaster_type_filter?: string;
  severity_filter: string;
  min_affected_population?: number;
  min_fatalities?: number;
  custom_keywords?: string;
  email_enabled: boolean;
  webhook_enabled: boolean;
  instant_alerts: boolean;
  digest_frequency: string;
  digest_time: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WebhookEndpoint {
  id?: number;
  user_id: string;
  name: string;
  url: string;
  secret_token?: string;
  retry_count: number;
  timeout_seconds: number;
  is_active: boolean;
  include_description: boolean;
  include_coordinates: boolean;
  custom_payload_template?: string;
  created_at?: string;
  updated_at?: string;
  last_success_at?: string;
  last_failure_at?: string;
  failure_count?: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: any;
}

// API functions
const alertApi = {
  // Alert Subscriptions
  async getSubscriptions(userId: string): Promise<AlertSubscription[]> {
    const response = await fetch(`${API_BASE}/api/alerts/subscriptions?user_id=${encodeURIComponent(userId)}`);
    const result: APIResponse<AlertSubscription[]> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch subscriptions');
    }
    return result.data || [];
  },

  async createSubscription(subscription: AlertSubscription): Promise<{ id: number }> {
    const response = await fetch(`${API_BASE}/api/alerts/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });
    const result: APIResponse<{ id: number }> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to create subscription');
    }
    return result.data!;
  },

  async updateSubscription(id: number, subscription: Partial<AlertSubscription>): Promise<void> {
    const response = await fetch(`${API_BASE}/api/alerts/subscriptions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });
    const result: APIResponse<void> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to update subscription');
    }
  },

  async deleteSubscription(id: number, userId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/alerts/subscriptions/${id}?user_id=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    const result: APIResponse<void> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete subscription');
    }
  },

  // Webhook Endpoints
  async getWebhooks(userId: string): Promise<WebhookEndpoint[]> {
    const response = await fetch(`${API_BASE}/api/alerts/webhooks?user_id=${encodeURIComponent(userId)}`);
    const result: APIResponse<WebhookEndpoint[]> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch webhooks');
    }
    return result.data || [];
  },

  async createWebhook(webhook: WebhookEndpoint): Promise<{ id: number }> {
    const response = await fetch(`${API_BASE}/api/alerts/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhook),
    });
    const result: APIResponse<{ id: number }> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to create webhook');
    }
    return result.data!;
  },

  // Test webhook endpoint
  async testWebhook(url: string): Promise<boolean> {
    try {
      // Simple ping test to check if webhook endpoint is reachable
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors'
      });
      return true;
    } catch {
      return false;
    }
  }
};

// Hooks
export function useAlertSubscriptions(userId: string) {
  return useQuery({
    queryKey: ['alert-subscriptions', userId],
    queryFn: () => alertApi.getSubscriptions(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateAlertSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: alertApi.createSubscription,
    onSuccess: (_, variables) => {
      // Invalidate subscriptions for this user
      queryClient.invalidateQueries({ queryKey: ['alert-subscriptions', variables.user_id] });
    },
  });
}

export function useUpdateAlertSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, subscription }: { id: number; subscription: Partial<AlertSubscription> }) =>
      alertApi.updateSubscription(id, subscription),
    onSuccess: (_, variables) => {
      // Invalidate subscriptions query
      queryClient.invalidateQueries({ queryKey: ['alert-subscriptions'] });
    },
  });
}

export function useDeleteAlertSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, userId }: { id: number; userId: string }) =>
      alertApi.deleteSubscription(id, userId),
    onSuccess: () => {
      // Invalidate subscriptions query
      queryClient.invalidateQueries({ queryKey: ['alert-subscriptions'] });
    },
  });
}

export function useWebhookEndpoints(userId: string) {
  return useQuery({
    queryKey: ['webhook-endpoints', userId],
    queryFn: () => alertApi.getWebhooks(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateWebhookEndpoint() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: alertApi.createWebhook,
    onSuccess: (_, variables) => {
      // Invalidate webhooks for this user
      queryClient.invalidateQueries({ queryKey: ['webhook-endpoints', variables.user_id] });
    },
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: alertApi.testWebhook,
  });
}

// Custom hook for getting user ID (placeholder - replace with actual auth)
export function useUserId(): string {
  // In a real app, this would come from your authentication system
  // For now, return a placeholder
  return 'user@example.com';
}