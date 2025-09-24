import { Env } from './types';

// Alert subscription management types
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
}

export interface NotificationTemplate {
  id?: number;
  user_id: string;
  name: string;
  template_type: 'email' | 'webhook' | 'digest';
  subject_template?: string;
  body_template: string;
  format: 'html' | 'text' | 'json';
  is_default: boolean;
  is_active: boolean;
}

export interface AlertQueueItem {
  id?: number;
  disaster_id: number;
  subscription_id?: number;
  webhook_id?: number;
  template_id?: number;
  priority: number;
  scheduled_for: string;
  recipient: string;
  subject?: string;
  content: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// Create alert subscription
export async function createAlertSubscription(env: Env, subscription: AlertSubscription): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const result = await env.DB.prepare(`
      INSERT INTO alert_subscriptions (
        user_id, name, country_filter, disaster_type_filter, severity_filter,
        min_affected_population, min_fatalities, custom_keywords,
        email_enabled, webhook_enabled, instant_alerts, digest_frequency, digest_time, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      subscription.user_id,
      subscription.name,
      subscription.country_filter,
      subscription.disaster_type_filter,
      subscription.severity_filter,
      subscription.min_affected_population,
      subscription.min_fatalities,
      subscription.custom_keywords,
      subscription.email_enabled ? 1 : 0,
      subscription.webhook_enabled ? 1 : 0,
      subscription.instant_alerts ? 1 : 0,
      subscription.digest_frequency,
      subscription.digest_time,
      subscription.is_active ? 1 : 0
    ).run();

    return { success: true, data: { id: result.meta.last_row_id } };
  } catch (error) {
    console.error('Error creating alert subscription:', error);
    return { success: false, error: 'Failed to create alert subscription' };
  }
}

// Get alert subscriptions for a user
export async function getAlertSubscriptions(env: Env, userId: string): Promise<{ success: boolean; data?: AlertSubscription[]; error?: string }> {
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM alert_subscriptions 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).bind(userId).all();

    return { success: true, data: result.results as unknown as AlertSubscription[] };
  } catch (error) {
    console.error('Error fetching alert subscriptions:', error);
    return { success: false, error: 'Failed to fetch alert subscriptions' };
  }
}

// Update alert subscription
export async function updateAlertSubscription(env: Env, id: number, subscription: Partial<AlertSubscription>): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(subscription).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        updates.push(`${key} = ?`);
        if (typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    });

    if (updates.length === 0) {
      return { success: false, error: 'No fields to update' };
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await env.DB.prepare(`
      UPDATE alert_subscriptions 
      SET ${updates.join(', ')} 
      WHERE id = ?
    `).bind(...values).run();

    return { success: true };
  } catch (error) {
    console.error('Error updating alert subscription:', error);
    return { success: false, error: 'Failed to update alert subscription' };
  }
}

// Delete alert subscription
export async function deleteAlertSubscription(env: Env, id: number, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await env.DB.prepare(`
      DELETE FROM alert_subscriptions 
      WHERE id = ? AND user_id = ?
    `).bind(id, userId).run();

    return { success: true };
  } catch (error) {
    console.error('Error deleting alert subscription:', error);
    return { success: false, error: 'Failed to delete alert subscription' };
  }
}

// Create webhook endpoint
export async function createWebhookEndpoint(env: Env, webhook: WebhookEndpoint): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const result = await env.DB.prepare(`
      INSERT INTO webhook_endpoints (
        user_id, name, url, secret_token, retry_count, timeout_seconds,
        is_active, include_description, include_coordinates, custom_payload_template
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      webhook.user_id,
      webhook.name,
      webhook.url,
      webhook.secret_token,
      webhook.retry_count,
      webhook.timeout_seconds,
      webhook.is_active ? 1 : 0,
      webhook.include_description ? 1 : 0,
      webhook.include_coordinates ? 1 : 0,
      webhook.custom_payload_template
    ).run();

    return { success: true, data: { id: result.meta.last_row_id } };
  } catch (error) {
    console.error('Error creating webhook endpoint:', error);
    return { success: false, error: 'Failed to create webhook endpoint' };
  }
}

// Get webhook endpoints for a user
export async function getWebhookEndpoints(env: Env, userId: string): Promise<{ success: boolean; data?: WebhookEndpoint[]; error?: string }> {
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM webhook_endpoints 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).bind(userId).all();

    return { success: true, data: result.results as unknown as WebhookEndpoint[] };
  } catch (error) {
    console.error('Error fetching webhook endpoints:', error);
    return { success: false, error: 'Failed to fetch webhook endpoints' };
  }
}

// Check if disaster matches subscription criteria
export function matchesSubscriptionCriteria(disaster: any, subscription: AlertSubscription): boolean {
  // Check severity filter
  const severityLevels = subscription.severity_filter.split(',').map(s => s.trim());
  if (!severityLevels.includes(disaster.severity)) {
    return false;
  }

  // Check country filter
  if (subscription.country_filter) {
    const allowedCountries = subscription.country_filter.split(',').map(c => c.trim());
    if (!allowedCountries.includes(disaster.country)) {
      return false;
    }
  }

  // Check disaster type filter
  if (subscription.disaster_type_filter) {
    const allowedTypes = subscription.disaster_type_filter.split(',').map(t => t.trim().toLowerCase());
    if (!allowedTypes.includes(disaster.disaster_type.toLowerCase())) {
      return false;
    }
  }

  // Check minimum affected population
  if (subscription.min_affected_population && disaster.affected_population) {
    if (disaster.affected_population < subscription.min_affected_population) {
      return false;
    }
  }

  // Check minimum fatalities
  if (subscription.min_fatalities && disaster.fatalities) {
    if (disaster.fatalities < subscription.min_fatalities) {
      return false;
    }
  }

  // Check custom keywords
  if (subscription.custom_keywords) {
    const keywords = subscription.custom_keywords.split(',').map(k => k.trim().toLowerCase());
    const searchText = `${disaster.title} ${disaster.description || ''}`.toLowerCase();
    const hasKeyword = keywords.some(keyword => searchText.includes(keyword));
    if (!hasKeyword) {
      return false;
    }
  }

  return true;
}

// Process alerts for new disaster
export async function processAlertsForDisaster(env: Env, disasterId: number): Promise<{ success: boolean; processed?: number; error?: string }> {
  try {
    // Get disaster details
    const disasterQuery = await env.DB.prepare(`
      SELECT d.*, c.name as country_name 
      FROM disasters d 
      LEFT JOIN countries c ON d.country = c.code 
      WHERE d.id = ?
    `).bind(disasterId).first();

    if (!disasterQuery) {
      return { success: false, error: 'Disaster not found' };
    }

    // Get all active subscriptions
    const subscriptionsQuery = await env.DB.prepare(`
      SELECT * FROM alert_subscriptions 
      WHERE is_active = 1
    `).all();

    const subscriptions = subscriptionsQuery.results as unknown as AlertSubscription[];
    let processedCount = 0;

    // Check each subscription against the disaster
    for (const subscription of subscriptions) {
      if (matchesSubscriptionCriteria(disasterQuery, subscription)) {
        // Add to alert queue if instant alerts are enabled
        if (subscription.instant_alerts) {
          await queueAlert(env, {
            disaster_id: disasterId,
            subscription_id: subscription.id!,
            priority: getSeverityPriority(String(disasterQuery.severity)),
            scheduled_for: new Date().toISOString(),
            recipient: subscription.user_id,
            content: JSON.stringify(disasterQuery),
            status: 'pending'
          });
          processedCount++;
        }
      }
    }

    return { success: true, processed: processedCount };
  } catch (error) {
    console.error('Error processing alerts for disaster:', error);
    return { success: false, error: 'Failed to process alerts' };
  }
}

// Queue an alert for processing
export async function queueAlert(env: Env, alert: AlertQueueItem): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO alert_queue (
      disaster_id, subscription_id, webhook_id, template_id, priority,
      scheduled_for, recipient, subject, content, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    alert.disaster_id,
    alert.subscription_id,
    alert.webhook_id,
    alert.template_id,
    alert.priority,
    alert.scheduled_for || new Date().toISOString(),
    alert.recipient,
    alert.subject,
    alert.content,
    alert.status
  ).run();
}

// Get severity priority for queue ordering
function getSeverityPriority(severity: string): number {
  switch (severity) {
    case 'RED': return 3;
    case 'ORANGE': return 2;
    case 'GREEN': return 1;
    default: return 1;
  }
}

// Process pending alerts from queue
export async function processPendingAlerts(env: Env, limit: number = 10): Promise<{ success: boolean; processed?: number; error?: string }> {
  try {
    // Get pending alerts with highest priority first
    const alertsQuery = await env.DB.prepare(`
      SELECT aq.*, d.title, d.disaster_type, d.severity, d.country, d.description,
             s.name as subscription_name, s.email_enabled, s.webhook_enabled
      FROM alert_queue aq
      LEFT JOIN disasters d ON aq.disaster_id = d.id
      LEFT JOIN alert_subscriptions s ON aq.subscription_id = s.id
      WHERE aq.status = 'pending'
      ORDER BY aq.priority DESC, aq.scheduled_for ASC
      LIMIT ?
    `).bind(limit).all();

    const alerts = alertsQuery.results;
    let processedCount = 0;

    for (const alert of alerts) {
      try {
        // Mark as processing
        await env.DB.prepare(`
          UPDATE alert_queue SET status = 'processing' WHERE id = ?
        `).bind(alert.id).run();

        // Send the alert (email or webhook)
        const success = await sendAlert(env, alert);

        // Update status
        await env.DB.prepare(`
          UPDATE alert_queue SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?
        `).bind(success ? 'completed' : 'failed', alert.id).run();

        // Log the alert
        await logAlert(env, alert, success);

        if (success) processedCount++;
      } catch (error) {
        console.error(`Error processing alert ${alert.id}:`, error);
        await env.DB.prepare(`
          UPDATE alert_queue SET status = 'failed' WHERE id = ?
        `).bind(alert.id).run();
      }
    }

    return { success: true, processed: processedCount };
  } catch (error) {
    console.error('Error processing pending alerts:', error);
    return { success: false, error: 'Failed to process pending alerts' };
  }
}

// Send individual alert
async function sendAlert(env: Env, alert: any): Promise<boolean> {
  try {
    if (alert.email_enabled) {
      return await sendEmailAlert(env, alert);
    } else if (alert.webhook_enabled) {
      return await sendWebhookAlert(env, alert);
    }
    return false;
  } catch (error) {
    console.error('Error sending alert:', error);
    return false;
  }
}

// Send email alert (placeholder - would integrate with email service)
async function sendEmailAlert(env: Env, alert: any): Promise<boolean> {
  // This would integrate with a service like Resend, SendGrid, or Mailgun
  console.log(`Sending email alert to ${alert.recipient}:`, alert.title);
  
  // For now, just return true as placeholder
  // In real implementation, you would:
  // 1. Get email template
  // 2. Render template with disaster data
  // 3. Send via email service
  // 4. Return success/failure
  
  return true;
}

// Send webhook alert
async function sendWebhookAlert(env: Env, alert: any): Promise<boolean> {
  try {
    // Get webhook endpoint details
    const webhookQuery = await env.DB.prepare(`
      SELECT * FROM webhook_endpoints WHERE user_id = ? AND is_active = 1 LIMIT 1
    `).bind(alert.recipient).first();

    if (!webhookQuery) {
      return false;
    }

    const webhook = webhookQuery as unknown as WebhookEndpoint;
    
    // Prepare payload
    const payload = {
      alert_type: 'disaster_event',
      timestamp: new Date().toISOString(),
      disaster: {
        id: alert.disaster_id,
        title: alert.title,
        type: alert.disaster_type,
        severity: alert.severity,
        country: alert.country,
        description: webhook.include_description ? alert.description : undefined,
      },
      subscription: {
        id: alert.subscription_id,
        name: alert.subscription_name
      }
    };

    // Send webhook
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FLARE360-Alert-System/1.0',
        ...(webhook.secret_token && { 'X-FLARE360-Secret': webhook.secret_token })
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(webhook.timeout_seconds * 1000)
    });

    if (response.ok) {
      // Update webhook success
      await env.DB.prepare(`
        UPDATE webhook_endpoints 
        SET last_success_at = CURRENT_TIMESTAMP, failure_count = 0 
        WHERE id = ?
      `).bind(webhook.id).run();
      return true;
    } else {
      // Update webhook failure
      await env.DB.prepare(`
        UPDATE webhook_endpoints 
        SET last_failure_at = CURRENT_TIMESTAMP, failure_count = failure_count + 1 
        WHERE id = ?
      `).bind(webhook.id).run();
      return false;
    }
  } catch (error) {
    console.error('Error sending webhook alert:', error);
    return false;
  }
}

// Log alert attempt
async function logAlert(env: Env, alert: any, success: boolean): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO alert_history (
      disaster_id, subscription_id, alert_type, recipient, subject, status, sent_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    alert.disaster_id,
    alert.subscription_id,
    alert.email_enabled ? 'email' : 'webhook',
    alert.recipient,
    alert.title,
    success ? 'sent' : 'failed'
  ).run();
}