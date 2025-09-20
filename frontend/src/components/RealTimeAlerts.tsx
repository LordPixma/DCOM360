import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  X, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  Users, 
  Settings,
  Volume2,
  VolumeX,
  Smartphone
} from 'lucide-react';
import { useDisasters } from '../hooks/useDisasters';

interface AlertPreferences {
  enabled: boolean;
  severity: ('RED' | 'ORANGE' | 'GREEN')[];
  types: string[];
  regions: string[];
  soundEnabled: boolean;
  pushEnabled: boolean;
}

interface DisasterAlert {
  id: string;
  disaster: any;
  timestamp: number;
  read: boolean;
  dismissed: boolean;
}

export const RealTimeAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<DisasterAlert[]>([]);
  const [preferences, setPreferences] = useState<AlertPreferences>({
    enabled: true,
    severity: ['RED', 'ORANGE'],
    types: ['earthquake', 'cyclone', 'flood', 'wildfire'],
    regions: [],
    soundEnabled: true,
    pushEnabled: false
  });
  const [showSettings, setShowSettings] = useState(false);
  const [lastDisasterCount, setLastDisasterCount] = useState(0);

  const { data: disasters, isLoading } = useDisasters({
    severity: '',
    country: '',
    type: '',
    limit: 50
  });

  // Allow opening settings from outside via custom events
  useEffect(() => {
    const open = () => setShowSettings(true);
    const toggle = () => setShowSettings((s) => !s);
    const close = () => setShowSettings(false);
    window.addEventListener('flare360:open-alert-settings', open as EventListener);
    window.addEventListener('flare360:toggle-alert-settings', toggle as EventListener);
    window.addEventListener('flare360:close-alert-settings', close as EventListener);
    return () => {
      window.removeEventListener('flare360:open-alert-settings', open as EventListener);
      window.removeEventListener('flare360:toggle-alert-settings', toggle as EventListener);
      window.removeEventListener('flare360:close-alert-settings', close as EventListener);
    };
  }, []);

  // Monitor for new disasters
  useEffect(() => {
    if (!disasters || isLoading) return;

    const currentCount = disasters.length;
    
    // Check if we have new disasters
    if (lastDisasterCount > 0 && currentCount > lastDisasterCount) {
      const newDisasters = disasters.slice(0, currentCount - lastDisasterCount);
      
      newDisasters.forEach(disaster => {
        // Check if disaster matches alert preferences
        if (shouldTriggerAlert(disaster)) {
          const alert: DisasterAlert = {
            id: `${disaster.id}-${Date.now()}`,
            disaster,
            timestamp: Date.now(),
            read: false,
            dismissed: false
          };
          
          setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep max 10 alerts
          
          if (preferences.soundEnabled) {
            playAlertSound();
          }
          
          if (preferences.pushEnabled) {
            showPushNotification(disaster);
          }
        }
      });
    }
    
    setLastDisasterCount(currentCount);
  }, [disasters, isLoading, lastDisasterCount, preferences]);

  const shouldTriggerAlert = (disaster: any): boolean => {
    if (!preferences.enabled) return false;
    
    // Check severity
    if (!preferences.severity.includes(disaster.severity)) return false;
    
    // Check type
    if (preferences.types.length > 0 && !preferences.types.includes(disaster.disaster_type)) {
      return false;
    }
    
    // Check regions (if specified)
    if (preferences.regions.length > 0 && !preferences.regions.includes(disaster.country)) {
      return false;
    }
    
    return true;
  };

  const playAlertSound = () => {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const showPushNotification = async (disaster: any) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${disaster.severity} Alert: ${disaster.disaster_type}`, {
        body: `${disaster.title} - ${disaster.country}`,
        icon: '/favicon.svg',
        tag: disaster.id
      });
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPreferences(prev => ({ ...prev, pushEnabled: true }));
      }
    }
  };

  const markAsRead = (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
      )
    );
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'RED': return 'text-red-600 bg-red-50 border-red-200';
      case 'ORANGE': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'RED': return '🔴';
      case 'ORANGE': return '🟠';
      default: return '🟢';
    }
  };

  const getDisasterIcon = (type: string) => {
    switch (type) {
      case 'earthquake': return '🌍';
      case 'cyclone': return '🌪️';
      case 'flood': return '🌊';
      case 'wildfire': return '🔥';
      case 'volcano': return '🌋';
      default: return '⚠️';
    }
  };

  const unreadCount = alerts.filter(alert => !alert.read).length;
  const fmtUTC = (ts: number) => {
    try { return new Date(ts).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour12: false }) + ' UTC' } catch { return String(ts) }
  }

  return (
    <>
  {/* Settings opened via menu item; floating bell removed per request */}

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            className="fixed top-0 right-0 h-screen w-96 bg-white dark:bg-slate-800 shadow-2xl border-l border-slate-200 dark:border-slate-700 z-40 overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Alert Settings</h2>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Enable/Disable Alerts */}
              <div className="mb-6">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={preferences.enabled}
                    onChange={(e) => setPreferences(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-900 dark:text-white">Enable Alerts</span>
                </label>
              </div>

              {/* Sound Settings */}
              <div className="mb-6">
                <h3 className="font-medium text-slate-900 dark:text-white mb-3">Sound & Notifications</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {preferences.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      <span className="text-sm text-slate-700 dark:text-slate-300">Alert Sound</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.soundEnabled}
                      onChange={(e) => setPreferences(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="w-4 h-4" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Push Notifications</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={preferences.pushEnabled}
                        onChange={(e) => {
                          if (e.target.checked) {
                            requestNotificationPermission();
                          } else {
                            setPreferences(prev => ({ ...prev, pushEnabled: false }));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                  </label>
                </div>
              </div>

              {/* Severity Filters */}
              <div className="mb-6">
                <h3 className="font-medium text-slate-900 dark:text-white mb-3">Alert Severity</h3>
                <div className="space-y-2">
                  {['RED', 'ORANGE', 'GREEN'].map(severity => (
                    <label key={severity} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={preferences.severity.includes(severity as any)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPreferences(prev => ({
                              ...prev,
                              severity: [...prev.severity, severity as any]
                            }));
                          } else {
                            setPreferences(prev => ({
                              ...prev,
                              severity: prev.severity.filter(s => s !== severity)
                            }));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm">{getSeverityIcon(severity)}</span>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{severity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Type Filters */}
              <div className="mb-6">
                <h3 className="font-medium text-slate-900 dark:text-white mb-3">Disaster Types</h3>
                <div className="space-y-2">
                  {['earthquake', 'cyclone', 'flood', 'wildfire', 'volcano'].map(type => (
                    <label key={type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={preferences.types.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPreferences(prev => ({
                              ...prev,
                              types: [...prev.types, type]
                            }));
                          } else {
                            setPreferences(prev => ({
                              ...prev,
                              types: prev.types.filter(t => t !== type)
                            }));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm">{getDisasterIcon(type)}</span>
                      <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clear All Button */}
              {alerts.length > 0 && (
                <button
                  onClick={clearAllAlerts}
                  className="w-full py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Clear All Alerts ({alerts.length})
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert Notifications */}
      <div className="fixed top-20 right-4 z-30 space-y-2 max-w-sm">
        <AnimatePresence>
          {alerts.slice(0, 3).map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 400, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 400, scale: 0.9 }}
              className={`p-4 rounded-lg border-2 shadow-lg bg-white dark:bg-slate-800 ${getSeverityColor(alert.disaster.severity)} ${
                alert.read ? 'opacity-75' : 'opacity-100'
              }`}
              onClick={() => markAsRead(alert.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">
                    {getDisasterIcon(alert.disaster.disaster_type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-white bg-opacity-60">
                        {alert.disaster.severity}
                      </span>
                      {!alert.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      )}
                    </div>
                    <h3 className="font-semibold text-sm leading-tight mb-1">
                      {alert.disaster.title}
                    </h3>
                    <div className="flex items-center space-x-1 text-xs opacity-75 mb-2">
                      <MapPin className="w-3 h-3" />
                      <span>{alert.disaster.country || alert.disaster.location}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs opacity-60">
                      <Clock className="w-3 h-3" />
                      <span title={new Date(alert.timestamp).toISOString()}>Updated {fmtUTC(alert.timestamp)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissAlert(alert.id);
                  }}
                  className="flex-shrink-0 p-1 hover:bg-white hover:bg-opacity-60 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Overlay for settings */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-25 z-30"
            onClick={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
