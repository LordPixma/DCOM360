import React, { useState, useEffect } from 'react';
import { Bell, Plus, Edit3, Trash2, Globe, Mail, AlertTriangle, Settings } from 'lucide-react';

// Types
interface AlertSubscription {
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

interface WebhookEndpoint {
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
}

// Mock API functions (would be replaced with actual API calls)
const alertApi = {
  getSubscriptions: async (userId: string): Promise<AlertSubscription[]> => {
    // Mock data for demonstration
    return [
      {
        id: 1,
        user_id: userId,
        name: 'Critical Events in West Africa',
        country_filter: 'NG,GH,SN',
        disaster_type_filter: 'earthquake,flood,cyclone',
        severity_filter: 'RED,ORANGE',
        email_enabled: true,
        webhook_enabled: false,
        instant_alerts: true,
        digest_frequency: 'daily',
        digest_time: '08:00',
        is_active: true,
        created_at: '2024-01-15T10:00:00Z'
      }
    ];
  },
  createSubscription: async (subscription: AlertSubscription): Promise<{ success: boolean; data?: any; error?: string }> => {
    console.log('Creating subscription:', subscription);
    return { success: true, data: { id: Date.now() } };
  },
  updateSubscription: async (id: number, subscription: Partial<AlertSubscription>): Promise<{ success: boolean; error?: string }> => {
    console.log('Updating subscription:', id, subscription);
    return { success: true };
  },
  deleteSubscription: async (id: number, userId: string): Promise<{ success: boolean; error?: string }> => {
    console.log('Deleting subscription:', id, userId);
    return { success: true };
  }
};

const AlertManagement: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<AlertSubscription[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<AlertSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId] = useState('user@example.com'); // In real app, get from auth context

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await alertApi.getSubscriptions(userId);
      setSubscriptions(data);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubscription = async (subscription: AlertSubscription) => {
    try {
      const result = await alertApi.createSubscription({ ...subscription, user_id: userId });
      if (result.success) {
        await loadSubscriptions();
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
    }
  };

  const handleUpdateSubscription = async (id: number, subscription: Partial<AlertSubscription>) => {
    try {
      const result = await alertApi.updateSubscription(id, subscription);
      if (result.success) {
        await loadSubscriptions();
        setEditingSubscription(null);
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
    }
  };

  const handleDeleteSubscription = async (id: number) => {
    if (!confirm('Are you sure you want to delete this alert subscription?')) return;
    
    try {
      const result = await alertApi.deleteSubscription(id, userId);
      if (result.success) {
        await loadSubscriptions();
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const levels = severity.split(',');
    return (
      <div className="flex gap-1">
        {levels.map(level => (
          <span
            key={level}
            className={`px-2 py-1 text-xs rounded-full ${
              level === 'RED' ? 'bg-red-100 text-red-800' :
              level === 'ORANGE' ? 'bg-orange-100 text-orange-800' :
              'bg-green-100 text-green-800'
            }`}
          >
            {level}
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Alert Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your disaster alert subscriptions and notification preferences
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Alert
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-blue-600">
                {subscriptions.filter(s => s.is_active).length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Email Alerts</p>
              <p className="text-2xl font-bold text-green-600">
                {subscriptions.filter(s => s.email_enabled).length}
              </p>
            </div>
            <Mail className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Webhook Alerts</p>
              <p className="text-2xl font-bold text-purple-600">
                {subscriptions.filter(s => s.webhook_enabled).length}
              </p>
            </div>
            <Globe className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Instant Alerts</p>
              <p className="text-2xl font-bold text-orange-600">
                {subscriptions.filter(s => s.instant_alerts).length}
              </p>
            </div>
            <Settings className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Alert Subscriptions</h2>
        </div>
        
        {subscriptions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No alerts configured</h3>
            <p className="mb-4">Create your first alert subscription to get notified about disasters.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Alert
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {subscriptions.map((subscription) => (
              <div key={subscription.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{subscription.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        subscription.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {subscription.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Severity:</span>
                        <div className="mt-1">{getSeverityBadge(subscription.severity_filter)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Countries:</span>
                        <p className="mt-1">{subscription.country_filter || 'All countries'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Types:</span>
                        <p className="mt-1">{subscription.disaster_type_filter || 'All types'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Delivery:</span>
                        <div className="mt-1 flex gap-2">
                          {subscription.email_enabled && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Email</span>
                          )}
                          {subscription.webhook_enabled && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">Webhook</span>
                          )}
                          {subscription.instant_alerts ? (
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">Instant</span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                              {subscription.digest_frequency}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setEditingSubscription(subscription)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit subscription"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSubscription(subscription.id!)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete subscription"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingSubscription) && (
        <SubscriptionModal
          subscription={editingSubscription}
          onSave={editingSubscription 
            ? (data) => handleUpdateSubscription(editingSubscription.id!, data)
            : handleCreateSubscription
          }
          onClose={() => {
            setShowCreateModal(false);
            setEditingSubscription(null);
          }}
        />
      )}
    </div>
  );
};

// Subscription Modal Component
interface SubscriptionModalProps {
  subscription?: AlertSubscription | null;
  onSave: (subscription: AlertSubscription) => void;
  onClose: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ subscription, onSave, onClose }) => {
  const [formData, setFormData] = useState<AlertSubscription>({
    user_id: '',
    name: '',
    severity_filter: 'RED,ORANGE',
    email_enabled: true,
    webhook_enabled: false,
    instant_alerts: true,
    digest_frequency: 'daily',
    digest_time: '08:00',
    is_active: true,
    ...subscription
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {subscription ? 'Edit Alert Subscription' : 'Create Alert Subscription'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subscription Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Critical Events in West Africa"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity Levels
              </label>
              <div className="space-y-2">
                {['RED', 'ORANGE', 'GREEN'].map(level => (
                  <label key={level} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.severity_filter.includes(level)}
                      onChange={(e) => {
                        const levels = formData.severity_filter.split(',');
                        if (e.target.checked) {
                          levels.push(level);
                        } else {
                          const index = levels.indexOf(level);
                          if (index > -1) levels.splice(index, 1);
                        }
                        setFormData({ ...formData, severity_filter: levels.join(',') });
                      }}
                      className="mr-2"
                    />
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      level === 'RED' ? 'bg-red-100 text-red-800' :
                      level === 'ORANGE' ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {level}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.email_enabled}
                    onChange={(e) => setFormData({ ...formData, email_enabled: e.target.checked })}
                    className="mr-2"
                  />
                  Email notifications
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.webhook_enabled}
                    onChange={(e) => setFormData({ ...formData, webhook_enabled: e.target.checked })}
                    className="mr-2"
                  />
                  Webhook notifications
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Countries (comma-separated ISO codes, leave empty for all)
            </label>
            <input
              type="text"
              value={formData.country_filter || ''}
              onChange={(e) => setFormData({ ...formData, country_filter: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., NG,GH,SN"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Disaster Types (comma-separated, leave empty for all)
            </label>
            <input
              type="text"
              value={formData.disaster_type_filter || ''}
              onChange={(e) => setFormData({ ...formData, disaster_type_filter: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., earthquake,flood,cyclone"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="instant"
              checked={formData.instant_alerts}
              onChange={(e) => setFormData({ ...formData, instant_alerts: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="instant" className="text-sm font-medium text-gray-700">
              Send instant alerts (uncheck for digest only)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {subscription ? 'Update' : 'Create'} Alert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AlertManagement;