-- Advanced Alert System Migration
-- Creates tables for alert subscriptions, notification settings, webhooks, and alert history

-- Alert Subscriptions Table
-- Stores user subscription preferences and custom thresholds
CREATE TABLE IF NOT EXISTS alert_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL, -- Identifier for user (email or user ID)
    name TEXT NOT NULL, -- Subscription name (e.g., "Critical Events in Asia")
    
    -- Subscription filters
    country_filter TEXT, -- ISO-2 country codes, comma-separated or NULL for all
    disaster_type_filter TEXT, -- disaster types, comma-separated or NULL for all
    severity_filter TEXT DEFAULT 'RED,ORANGE', -- Severity levels to monitor
    
    -- Custom thresholds
    min_affected_population INTEGER, -- Minimum affected population to trigger alert
    min_fatalities INTEGER, -- Minimum fatalities to trigger alert
    custom_keywords TEXT, -- Keywords in title/description to match
    
    -- Delivery preferences
    email_enabled BOOLEAN DEFAULT 1,
    webhook_enabled BOOLEAN DEFAULT 0,
    instant_alerts BOOLEAN DEFAULT 1, -- Send immediately vs digest
    digest_frequency TEXT DEFAULT 'daily', -- daily, weekly, none
    digest_time TEXT DEFAULT '08:00', -- Time for digest delivery (HH:MM)
    
    -- Metadata
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhook Endpoints Table
-- Stores webhook configurations for organizations
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL, -- Endpoint name
    url TEXT NOT NULL, -- Webhook URL
    secret_token TEXT, -- Optional secret for webhook verification
    
    -- Delivery settings
    retry_count INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT 1,
    
    -- Payload customization
    include_description BOOLEAN DEFAULT 1,
    include_coordinates BOOLEAN DEFAULT 1,
    custom_payload_template TEXT, -- JSON template for custom payloads
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_success_at TIMESTAMP,
    last_failure_at TIMESTAMP,
    failure_count INTEGER DEFAULT 0
);

-- Alert History Table
-- Tracks all sent alerts for debugging and analytics
CREATE TABLE IF NOT EXISTS alert_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    disaster_id INTEGER NOT NULL,
    subscription_id INTEGER,
    webhook_id INTEGER,
    
    -- Alert details
    alert_type TEXT NOT NULL, -- 'email', 'webhook', 'digest'
    recipient TEXT NOT NULL, -- Email address or webhook URL
    subject TEXT,
    
    -- Delivery status
    status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
    sent_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Alert content hash for deduplication
    content_hash TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (disaster_id) REFERENCES disasters (id),
    FOREIGN KEY (subscription_id) REFERENCES alert_subscriptions (id),
    FOREIGN KEY (webhook_id) REFERENCES webhook_endpoints (id)
);

-- Notification Templates Table
-- Customizable email and webhook templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    template_type TEXT NOT NULL, -- 'email', 'webhook', 'digest'
    
    -- Template content
    subject_template TEXT, -- For emails
    body_template TEXT NOT NULL, -- Email body or webhook payload template
    format TEXT DEFAULT 'html', -- html, text, json
    
    -- Template variables supported: {{title}}, {{country}}, {{severity}}, {{description}}, etc.
    
    is_default BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alert Queue Table
-- For processing alerts asynchronously
CREATE TABLE IF NOT EXISTS alert_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    disaster_id INTEGER NOT NULL,
    subscription_id INTEGER,
    webhook_id INTEGER,
    template_id INTEGER,
    
    -- Processing info
    priority INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high
    scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    
    -- Payload data
    recipient TEXT NOT NULL,
    subject TEXT,
    content TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (disaster_id) REFERENCES disasters (id),
    FOREIGN KEY (subscription_id) REFERENCES alert_subscriptions (id),
    FOREIGN KEY (webhook_id) REFERENCES webhook_endpoints (id),
    FOREIGN KEY (template_id) REFERENCES notification_templates (id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_user_id ON alert_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_active ON alert_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user_id ON webhook_endpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active ON webhook_endpoints(is_active);
CREATE INDEX IF NOT EXISTS idx_alert_history_disaster_id ON alert_history(disaster_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_created_at ON alert_history(created_at);
CREATE INDEX IF NOT EXISTS idx_alert_queue_status ON alert_queue(status);
CREATE INDEX IF NOT EXISTS idx_alert_queue_scheduled_for ON alert_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_alert_queue_priority ON alert_queue(priority DESC);

-- Insert default notification templates
INSERT OR IGNORE INTO notification_templates (
    user_id, name, template_type, subject_template, body_template, format, is_default
) VALUES 
('system', 'Default Email Alert', 'email', 
    'FLARE360 Alert: {{severity}} {{disaster_type}} in {{country}}',
    '<!DOCTYPE html>
    <html>
    <head><title>Disaster Alert</title></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🚨 Disaster Alert</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">{{severity}} Severity Event Detected</p>
        </div>
        <div style="background: white; padding: 20px; border: 1px solid #e1e5e9; border-radius: 0 0 8px 8px;">
            <h2 style="color: #2d3748; margin-top: 0;">{{title}}</h2>
            <div style="background: #f7fafc; padding: 15px; border-radius: 6px; margin: 15px 0;">
                <p><strong>Type:</strong> {{disaster_type}}</p>
                <p><strong>Country:</strong> {{country}}</p>
                <p><strong>Severity:</strong> <span style="color: {{severity_color}};">{{severity}}</span></p>
                <p><strong>Date:</strong> {{event_date}}</p>
                {{#if coordinates}}<p><strong>Location:</strong> {{coordinates.lat}}, {{coordinates.lng}}</p>{{/if}}
            </div>
            {{#if description}}
            <h3>Description:</h3>
            <p style="line-height: 1.6;">{{description}}</p>
            {{/if}}
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e1e5e9; text-align: center;">
                <a href="{{dashboard_url}}" style="background: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View on Dashboard</a>
            </div>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>This alert was sent by FLARE360 Disaster Monitoring System</p>
            <p><a href="{{unsubscribe_url}}" style="color: #666;">Unsubscribe</a></p>
        </div>
    </body>
    </html>', 'html', 1),

('system', 'Default Webhook Payload', 'webhook',
    NULL,
    '{
        "alert_type": "disaster_event",
        "timestamp": "{{timestamp}}",
        "disaster": {
            "id": {{disaster_id}},
            "title": "{{title}}",
            "type": "{{disaster_type}}",
            "severity": "{{severity}}",
            "country": "{{country}}",
            "event_date": "{{event_date}}",
            {{#if coordinates}}"coordinates": {"lat": {{coordinates.lat}}, "lng": {{coordinates.lng}}},{{/if}}
            {{#if description}}"description": "{{description}}",{{/if}}
            "dashboard_url": "{{dashboard_url}}"
        },
        "subscription": {
            "id": {{subscription_id}},
            "name": "{{subscription_name}}"
        }
    }', 'json', 1),

('system', 'Daily Digest Email', 'digest',
    'FLARE360 Daily Digest - {{disaster_count}} disasters reported',
    '<!DOCTYPE html>
    <html>
    <head><title>Daily Disaster Digest</title></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">📊 Daily Disaster Digest</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">{{date}} - {{disaster_count}} events reported</p>
        </div>
        <div style="background: white; padding: 20px; border: 1px solid #e1e5e9; border-radius: 0 0 8px 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <div style="text-align: center; flex: 1;">
                    <div style="font-size: 24px; font-weight: bold; color: #e53e3e;">{{red_count}}</div>
                    <div style="font-size: 12px; color: #666;">RED Alerts</div>
                </div>
                <div style="text-align: center; flex: 1;">
                    <div style="font-size: 24px; font-weight: bold; color: #dd6b20;">{{orange_count}}</div>
                    <div style="font-size: 12px; color: #666;">ORANGE Alerts</div>
                </div>
                <div style="text-align: center; flex: 1;">
                    <div style="font-size: 24px; font-weight: bold; color: #38a169;">{{green_count}}</div>
                    <div style="font-size: 12px; color: #666;">GREEN Alerts</div>
                </div>
            </div>
            
            {{#each disasters}}
            <div style="border-left: 4px solid {{severity_color}}; padding: 15px; margin: 15px 0; background: #f7fafc;">
                <h3 style="margin: 0 0 10px 0; color: #2d3748;">{{title}}</h3>
                <p style="margin: 5px 0; color: #666; font-size: 14px;">
                    <strong>{{disaster_type}}</strong> in <strong>{{country}}</strong> • {{severity}} severity • {{event_date}}
                </p>
                {{#if description}}<p style="margin: 10px 0 0 0; font-size: 14px; line-height: 1.5;">{{truncated_description}}</p>{{/if}}
            </div>
            {{/each}}
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e1e5e9; text-align: center;">
                <a href="{{dashboard_url}}" style="background: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Full Dashboard</a>
            </div>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>This digest was sent by FLARE360 Disaster Monitoring System</p>
            <p><a href="{{unsubscribe_url}}" style="color: #666;">Unsubscribe</a> | <a href="{{manage_url}}" style="color: #666;">Manage Preferences</a></p>
        </div>
    </body>
    </html>', 'html', 1);