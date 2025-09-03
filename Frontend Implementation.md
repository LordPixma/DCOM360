# GDACS Dashboard - Frontend Components Implementation Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Traffic Light Status Panel](#traffic-light-status-panel)
3. [Interactive Disaster Map](#interactive-disaster-map)
4. [Recent Disasters Timeline](#recent-disasters-timeline)
5. [Statistics Dashboard](#statistics-dashboard)
6. [Filters and Search](#filters-and-search)
7. [Common UI Components](#common-ui-components)
8. [Custom Hooks](#custom-hooks)
9. [State Management](#state-management)
10. [Performance Optimization](#performance-optimization)

## Architecture Overview

### Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Headless UI
- **State Management**: React Query + Zustand
- **Animation**: Framer Motion
- **Maps**: Mapbox GL JS
- **Charts**: Chart.js + React Chart.js 2
- **Icons**: Lucide React
- **Date Handling**: date-fns

### Component Structure
```
src/
├── components/
│   ├── common/           # Reusable UI components
│   ├── dashboard/        # Dashboard-specific components
│   ├── charts/          # Chart components
│   └── ui/              # Basic UI primitives
├── hooks/               # Custom React hooks
├── services/            # API and external services
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── styles/              # Global styles
```

## Traffic Light Status Panel

### TrafficLights Component
```typescript
// dashboard/src/components/dashboard/TrafficLights.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useSummary } from '../../hooks/useSummary';

interface TrafficLightProps {
  severity: 'red' | 'orange' | 'green';
  count: number;
  affectedPopulation: number;
  isLoading: boolean;
}

const TrafficLight: React.FC<TrafficLightProps> = ({ 
  severity, 
  count, 
  affectedPopulation, 
  isLoading 
}) => {
  const colors = {
    red: { 
      bg: 'bg-red-500', 
      text: 'text-red-900', 
      light: 'bg-red-100',
      border: 'border-red-500',
      pulse: 'shadow-red-500/50'
    },
    orange: { 
      bg: 'bg-orange-500', 
      text: 'text-orange-900', 
      light: 'bg-orange-100',
      border: 'border-orange-500',
      pulse: 'shadow-orange-500/50'
    },
    green: { 
      bg: 'bg-green-500', 
      text: 'text-green-900', 
      light: 'bg-green-100',
      border: 'border-green-500',
      pulse: 'shadow-green-500/50'
    }
  };

  const formatPopulation = (pop: number): string => {
    if (pop >= 1000000) return `${(pop / 1000000).toFixed(1)}M`;
    if (pop >= 1000) return `${(pop / 1000).toFixed(1)}K`;
    return pop.toString();
  };

  const severityLabels = {
    red: 'Critical',
    orange: 'High Risk',
    green: 'Low Risk'
  };

  return (
    <motion.div
      className={`relative p-6 rounded-xl ${colors[severity].light} border-l-4 ${colors[severity].border} backdrop-blur-sm`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      data-testid={`${severity}-alert`}
    >
      {/* Traffic Light Circle */}
      <div className="flex items-center justify-center mb-4">
        <motion.div
          className={`w-16 h-16 rounded-full ${colors[severity].bg} flex items-center justify-center shadow-lg ${colors[severity].pulse}`}
          animate={count > 0 && !isLoading ? { 
            scale: [1, 1.1, 1],
            boxShadow: [
              `0 0 0 0 rgba(${severity === 'red' ? '239, 68, 68' : severity === 'orange' ? '249, 115, 22' : '34, 197, 94'}, 0)`,
              `0 0 0 10px rgba(${severity === 'red' ? '239, 68, 68' : severity === 'orange' ? '249, 115, 22' : '34, 197, 94'}, 0.1)`,
              `0 0 0 0 rgba(${severity === 'red' ? '239, 68, 68' : severity === 'orange' ? '249, 115, 22' : '34, 197, 94'}, 0)`
            ]
          } : {}}
          transition={{ 
            repeat: count > 0 && !isLoading ? Infinity : 0, 
            duration: 2,
            ease: "easeInOut"
          }}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          ) : (
            <span className="text-white text-2xl font-bold">
              {count}
            </span>
          )}
        </motion.div>
      </div>

      {/* Status Information */}
      <div className="text-center">
        <h3 className={`text-lg font-semibold ${colors[severity].text} uppercase tracking-wide mb-2`}>
          {severity} Alerts
        </h3>
        
        <p className="text-sm text-gray-600 mb-2">
          {severityLabels[severity]}
        </p>
        
        {!isLoading && (
          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-sm font-medium text-gray-700">
              {count === 0 ? 'No active alerts' : `${count} active alert${count !== 1 ? 's' : ''}`}
            </p>
            
            {affectedPopulation > 0 && (
              <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
                <span>👥</span>
                <span>{formatPopulation(affectedPopulation)} people affected</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Trend Indicator */}
        {!isLoading && count > 0 && (
          <motion.div 
            className="mt-3 flex items-center justify-center space-x-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className={`w-2 h-2 rounded-full ${colors[severity].bg}`}></div>
            <span className="text-xs text-gray-500">Active monitoring</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export const TrafficLights: React.FC = () => {
  const { data: summary, isLoading, error, isRefetching } = useSummary({
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (error) {
    return (
      <motion.div 
        className="bg-red-50 border border-red-200 rounded-lg p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center space-x-2">
          <span className="text-red-500">⚠️</span>
          <p className="text-red-800 font-medium">Failed to load disaster summary</p>
        </div>
        <p className="text-red-600 text-sm mt-1">Please try refreshing the page</p>
      </motion.div>
    );
  }

  const severityData = summary?.severity_breakdown || {
    red: { count: 0, affected_population: 0 },
    orange: { count: 0, affected_population: 0 },
    green: { count: 0, affected_population: 0 }
  };

  const totalDisasters = Object.values(severityData).reduce((sum, data) => sum + data.count, 0);

  return (
    <div className="space-y-4" data-testid="traffic-lights">
      {/* Header with refresh indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Global Alert Status</h2>
        {isRefetching && (
          <motion.div 
            className="flex items-center space-x-2 text-sm text-gray-500"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Updating...</span>
          </motion.div>
        )}
      </div>

      {/* Summary Stats */}
      {!isLoading && summary && (
        <motion.div 
          className="bg-gray-50 rounded-lg p-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalDisasters}</p>
              <p className="text-sm text-gray-600">Total Active</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totals?.total_affected_population?.toLocaleString() || 0}
              </p>
              <p className="text-sm text-gray-600">People Affected</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.recent_24h || 0}</p>
              <p className="text-sm text-gray-600">Last 24h</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {summary.last_updated ? new Date(summary.last_updated).toLocaleTimeString() : '--:--'}
              </p>
              <p className="text-sm text-gray-600">Last Updated</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Traffic Light Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TrafficLight
          severity="red"
          count={severityData.red.count}
          affectedPopulation={severityData.red.affected_population}
          isLoading={isLoading}
        />
        <TrafficLight
          severity="orange"
          count={severityData.orange.count}
          affectedPopulation={severityData.orange.affected_population}
          isLoading={isLoading}
        />
        <TrafficLight
          severity="green"
          count={severityData.green.count}
          affectedPopulation={severityData.green.affected_population}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
```

## Interactive Disaster Map

### DisasterMap Component
```typescript
// dashboard/src/components/dashboard/DisasterMap.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { useDisasters } from '../../hooks/useDisasters';
import { DisasterAPIData } from '../../types/api';
import { motion } from 'framer-motion';

// Ensure Mapbox token is set
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

interface DisasterMapProps {
  selectedCountry?: string;
  selectedSeverity?: string;
  selectedType?: string;
  onDisasterClick?: (disaster: DisasterAPIData) => void;
  className?: string;
}

interface MapState {
  isLoaded: boolean;
  error: string | null;
  markersCount: number;
}

export const DisasterMap: React.FC<DisasterMapProps> = ({
  selectedCountry,
  selectedSeverity,
  selectedType,
  onDisasterClick,
  className = ""
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapState, setMapState] = useState<MapState>({
    isLoaded: false,
    error: null,
    markersCount: 0
  });
  
  const { data: disasters, isLoading, error: dataError } = useDisasters({
    country: selectedCountry,
    severity: selectedSeverity,
    disaster_type: selectedType,
    limit: 1000 // Get all disasters for map
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!mapboxgl.accessToken) {
      setMapState(prev => ({ ...prev, error: 'Mapbox access token not configured' }));
      return;
    }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [0, 20],
        zoom: 2,
        maxZoom: 15,
        minZoom: 1,
        attributionControl: false
      });

      // Add controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      
      // Add attribution control at bottom left
      map.current.addControl(
        new mapboxgl.AttributionControl({
          compact: true,
          customAttribution: '© GDACS'
        }),
        'bottom-left'
      );

      map.current.on('load', () => {
        setMapState(prev => ({ ...prev, isLoaded: true, error: null }));
      });

      map.current.on('error', (e) => {
        setMapState(prev => ({ ...prev, error: 'Failed to load map' }));
        console.error('Map error:', e);
      });

    } catch (error) {
      setMapState(prev => ({ ...prev, error: 'Failed to initialize map' }));
      console.error('Map initialization error:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Create disaster marker
  const createDisasterMarker = useCallback((disaster: DisasterAPIData): mapboxgl.Marker => {
    const el = document.createElement('div');
    el.className = 'disaster-marker';
    
    const severityColors = {
      RED: '#ef4444',
      ORANGE: '#f97316', 
      GREEN: '#22c55e'
    };
    
    const disasterIcons = {
      earthquake: '🌍',
      cyclone: '🌪️',
      flood: '🌊',
      wildfire: '🔥',
      volcano: '🌋'
    };

    const size = disaster.severity === 'RED' ? 50 : disaster.severity === 'ORANGE' ? 45 : 40;
    const pulseAnimation = disaster.severity === 'RED' ? 'animate-pulse' : '';

    el.innerHTML = `
      <div class="marker-content ${pulseAnimation}" style="
        background-color: ${severityColors[disaster.severity]};
        border: 3px solid white;
        border-radius: 50%;
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${size * 0.4}px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.2s ease;
        position: relative;
        z-index: 10;
      ">
        ${disasterIcons[disaster.disaster_type] || '⚠️'}
      </div>
    `;

    // Hover effects
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.2)';
      el.style.zIndex = '20';
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)';
      el.style.zIndex = '10';
    });

    // Click handler
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onDisasterClick?.(disaster);
    });

    // Create popup with detailed information
    const popup = new mapboxgl.Popup({ 
      offset: 25,
      className: 'disaster-popup'
    }).setHTML(`
      <div class="p-3 max-w-sm">
        <div class="flex items-center space-x-2 mb-2">
          <span class="text-xl">${disasterIcons[disaster.disaster_type] || '⚠️'}</span>
          <h3 class="font-semibold text-lg text-gray-900">${disaster.title}</h3>
        </div>
        
        <div class="space-y-2 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-gray-600">Location:</span>
            <span class="font-medium">${disaster.location}</span>
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-gray-600">Severity:</span>
            <span class="px-2 py-1 rounded text-xs font-medium" style="
              background-color: ${severityColors[disaster.severity]}20;
              color: ${severityColors[disaster.severity]};
              border: 1px solid ${severityColors[disaster.severity]}40;
            ">${disaster.severity}</span>
          </div>
          
          ${disaster.magnitude ? `
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Magnitude:</span>
              <span class="font-medium">${disaster.magnitude}</span>
            </div>
          ` : ''}
          
          ${disaster.wind_speed ? `
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Wind Speed:</span>
              <span class="font-medium">${disaster.wind_speed} km/h</span>
            </div>
          ` : ''}
          
          ${disaster.affected_population > 0 ? `
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Affected:</span>
              <span class="font-medium">${disaster.affected_population.toLocaleString()} people</span>
            </div>
          ` : ''}
          
          <div class="flex items-center justify-between">
            <span class="text-gray-600">Time:</span>
            <span class="font-medium">${new Date(disaster.event_timestamp).toLocaleDateString()} ${new Date(disaster.event_timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
        
        <div class="mt-3 pt-2 border-t border-gray-100">
          <p class="text-xs text-gray-500 italic">${disaster.description}</p>
        </div>
      </div>
    `);

    return new mapboxgl.Marker(el)
      .setLngLat([disaster.coordinates!.lng, disaster.coordinates!.lat])
      .setPopup(popup);
  }, [onDisasterClick]);

  // Update markers when disasters data changes
  useEffect(() => {
    if (!map.current || !mapState.isLoaded || !disasters) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    const validDisasters = disasters.filter(d => d.coordinates);
    
    validDisasters.forEach(disaster => {
      try {
        const marker = createDisasterMarker(disaster);
        marker.addTo(map.current!);
        markersRef.current.push(marker);
      } catch (error) {
        console.warn('Failed to create marker for disaster:', disaster.id, error);
      }
    });

    setMapState(prev => ({ ...prev, markersCount: validDisasters.length }));

    // Fit map to show all markers if we have disasters
    if (validDisasters.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      
      validDisasters.forEach(disaster => {
        if (disaster.coordinates) {
          bounds.extend([disaster.coordinates.lng, disaster.coordinates.lat]);
        }
      });
      
      // Only fit bounds if we have valid bounds
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 10,
          duration: 1000
        });
      }
    } else {
      // Reset to world view if no disasters
      map.current.easeTo({
        center: [0, 20],
        zoom: 2,
        duration: 1000
      });
    }
  }, [disasters, mapState.isLoaded, createDisasterMarker]);

  // Handle data loading error
  const hasError = mapState.error || dataError;

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full h-96 md:h-[500px] rounded-lg border border-gray-200 bg-gray-100"
        data-testid="disaster-map"
      />
      
      {/* Loading Overlay */}
      {(isLoading || !mapState.isLoaded) && !hasError && (
        <div className="absolute inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center rounded-lg backdrop-blur-sm">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <div className="absolute inset-0 rounded-full h-12 w-12 border-t-2 border-blue-200 mx-auto animate-pulse"></div>
            </div>
            <p className="mt-4 text-gray-600 font-medium">
              {!mapState.isLoaded ? 'Loading map...' : 'Loading disasters...'}
            </p>
          </motion.div>
        </div>
      )}
      
      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <motion.div 
            className="text-center p-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Map Unavailable</h3>
            <p className="text-gray-600 mb-4">
              {mapState.error || 'Unable to load disaster data'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        </div>
      )}
      
      {/* No Data Overlay */}
      {disasters && disasters.length === 0 && !isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div 
            className="text-center p-6 bg-white bg-opacity-90 rounded-lg shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-4xl mb-2">🌍</div>
            <p className="text-gray-600 font-medium">No disasters to display</p>
            <p className="text-sm text-gray-500 mt-1">
              {selectedCountry || selectedSeverity || selectedType ? 
                'Try adjusting your filters' : 
                "That's good news!"}
            </p>
          </motion.div>
        </div>
      )}

      {/* Map Stats */}
      {mapState.isLoaded && disasters && disasters.length > 0 && (
        <motion.div 
          className="absolute top-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center space-x-2 text-sm">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="font-medium text-gray-700">
              {mapState.markersCount} disaster{mapState.markersCount !== 1 ? 's' : ''} shown
            </span>
          </div>
        </motion.div>
      )}

      {/* Map Legend */}
      <motion.div 
        className="absolute bottom-4 right-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Severity Levels</h4>
        <div className="space-y-1">
          {[
            { level: 'RED', color: '#ef4444', label: 'Critical' },
            { level: 'ORANGE', color: '#f97316', label: 'High Risk' },
            { level: 'GREEN', color: '#22c55e', label: 'Low Risk' }
          ].map(({ level, color, label }) => (
            <div key={level} className="flex items-center space-x-2 text-xs">
              <div 
                className="w-3 h-3 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: color }}
              ></div>
              <span className="text-gray-700">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
```

## Recent Disasters Timeline

### RecentDisasters Component
```typescript
// dashboard/src/components/dashboard/RecentDisasters.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDisasters } from '../../hooks/useDisasters';
import { DisasterAPIData } from '../../types/api';
import { formatDistanceToNow, format } from 'date-fns';
import { ChevronRight, MapPin, Clock, Users } from 'lucide-react';

interface DisasterCardProps {
  disaster: DisasterAPIData;
  onClick?: () => void;
  index: number;
}

const DisasterCard: React.FC<DisasterCardProps> = ({ disaster, onClick, index }) => {
  const severityColors = {
    RED: { 
      bg: 'bg-red-50', 
      border: 'border-red-200', 
      text: 'text-red-800', 
      badge: 'bg-red-500',
      accent: 'bg-red-100'
    },
    ORANGE: { 
      bg: 'bg-orange-50', 
      border: 'border-orange-200', 
      text: 'text-orange-800', 
      badge: 'bg-orange-500',
      accent: 'bg-orange-100'
    },
    GREEN: { 
      bg: 'bg-green-50', 
      border: 'border-green-200', 
      text: 'text-green-800', 
      badge: 'bg-green-500',
      accent: 'bg-green-100'
    }
  };

  const disasterIcons = {
    earthquake: '🌍',
    cyclone: '🌪️',
    flood: '🌊',
    wildfire: '🔥',
    volcano: '🌋'
  };

  const colors = severityColors[disaster.severity];
  
  return (
    <motion.div
      className={`${colors.bg} ${colors.border} border rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-300 group relative overflow-hidden`}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      data-testid="disaster-card"
    >
      {/* Animated background effect */}
      <div className={`absolute inset-0 ${colors.accent} opacity-0 group-hover:opacity-30 transition-opacity duration-300`}></div>
      
      <div className="relative z-10 flex items-start space-x-4">
        {/* Disaster Icon */}
        <div className="flex-shrink-0">
          <motion.div
            className="text-3xl"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
            {disasterIcons[disaster.disaster_type] || '⚠️'}
          </motion.div>
        </div>
        
        {/* Disaster Info */}
        <div className="flex-grow min-w-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-grow min-w-0 mr-3">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className={`font-semibold text-base ${colors.text} truncate`}>
                  {disaster.title}
                </h3>
                <motion.span 
                  className={`${colors.badge} text-white text-xs px-2 py-1 rounded-full font-medium`}
                  whileHover={{ scale: 1.05 }}
                >
                  {disaster.severity}
                </motion.span>
              </div>
              
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {disaster.description}
              </p>
            </div>
            
            <ChevronRight 
              className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" 
            />
          </div>
          
          {/* Location and Time */}
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
            <div className="flex items-center space-x-1 min-w-0 flex-1">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{disaster.location}</span>
            </div>
            
            <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
              <Clock className="w-4 h-4" />
              <span className="whitespace-nowrap">
                {formatDistanceToNow(new Date(disaster.event_timestamp), { addSuffix: true })}
              </span>
            </div>
          </div>
          
          {/* Additional Details */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-xs">
              {disaster.magnitude && (
                <div className="flex items-center space-x-1">
                  <span className="font-medium text-gray-700">Magnitude:</span>
                  <span className={`${colors.text} font-bold`}>M{disaster.magnitude}</span>
                </div>
              )}
              {disaster.wind_speed && (
                <div className="flex items-center space-x-1">
                  <span className="font-medium text-gray-700">Wind:</span>
                  <span className={`${colors.text} font-bold`}>{disaster.wind_speed}km/h</span>
                </div>
              )}
              {disaster.depth_km && (
                <div className="flex items-center space-x-1">
                  <span className="font-medium text-gray-700">Depth:</span>
                  <span className={`${colors.text} font-bold`}>{disaster.depth_km}km</span>
                </div>
              )}
            </div>
            
            {disaster.affected_population > 0 && (
              <div className="flex items-center space-x-1 text-xs">
                <Users className="w-3 h-3 text-gray-500" />
                <span className="text-gray-600 font-medium">
                  {disaster.affected_population.toLocaleString()} affected
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hover effect border */}
      <motion.div 
        className={`absolute bottom-0 left-0 h-1 ${colors.badge} rounded-full`}
        initial={{ width: 0 }}
        whileHover={{ width: "100%" }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
};

interface DisasterDetailsModalProps {
  disaster: DisasterAPIData | null;
  isOpen: boolean;
  onClose: () => void;
}

const DisasterDetailsModal: React.FC<DisasterDetailsModalProps> = ({
  disaster,
  isOpen,
  onClose
}) => {
  if (!disaster) return null;

  const severityColors = {
    RED: 'from-red-500 to-red-600',
    ORANGE: 'from-orange-500 to-orange-600',
    GREEN: 'from-green-500 to-green-600'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`bg-gradient-to-r ${severityColors[disaster.severity]} text-white p-6`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">
                      {disaster.disaster_type === 'earthquake' ? '🌍' :
                       disaster.disaster_type === 'cyclone' ? '🌪️' :
                       disaster.disaster_type === 'flood' ? '🌊' :
                       disaster.disaster_type === 'wildfire' ? '🔥' :
                       disaster.disaster_type === 'volcano' ? '🌋' : '⚠️'}
                    </span>
                    <div>
                      <h2 className="text-2xl font-bold">{disaster.title}</h2>
                      <p className="text-white/90 text-sm">{disaster.location}</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white text-3xl font-light"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      Basic Information
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Severity:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          disaster.severity === 'RED' ? 'bg-red-100 text-red-800' :
                          disaster.severity === 'ORANGE' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {disaster.severity}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium capitalize">{disaster.disaster_type}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Event Time:</span>
                        <span className="font-medium">
                          {format(new Date(disaster.event_timestamp), 'PPpp')}
                        </span>
                      </div>
                      
                      {disaster.country && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Country:</span>
                          <span className="font-medium">{disaster.country}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Technical Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      Technical Details
                    </h3>
                    
                    <div className="space-y-3">
                      {disaster.magnitude && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Magnitude:</span>
                          <span className="font-bold text-lg">M{disaster.magnitude}</span>
                        </div>
                      )}
                      
                      {disaster.depth_km && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Depth:</span>
                          <span className="font-medium">{disaster.depth_km} km</span>
                        </div>
                      )}
                      
                      {disaster.wind_speed && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Wind Speed:</span>
                          <span className="font-bold text-lg">{disaster.wind_speed} km/h</span>
                        </div>
                      )}
                      
                      {disaster.affected_population > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">People Affected:</span>
                          <span className="font-bold text-lg text-red-600">
                            {disaster.affected_population.toLocaleString()}
                          </span>
                        </div>
                      )}
                      
                      {disaster.coordinates && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Coordinates:</span>
                          <span className="font-mono text-sm">
                            {disaster.coordinates.lat.toFixed(3)}, {disaster.coordinates.lng.toFixed(3)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {disaster.description && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                    <p className="text-gray-700 leading-relaxed">{disaster.description}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-6 pt-6 border-t flex justify-end space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  {disaster.coordinates && (
                    <button
                      onClick={() => {
                        window.open(`https://www.google.com/maps?q=${disaster.coordinates!.lat},${disaster.coordinates!.lng}`, '_blank');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View on Map
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const RecentDisasters: React.FC = () => {
  const [selectedDisaster, setSelectedDisaster] = useState<DisasterAPIData | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  const { data: disasters, isLoading, error } = useDisasters({ 
    limit: 20,
    sort: 'recent' 
  });

  const handleDisasterClick = (disaster: DisasterAPIData) => {
    setSelectedDisaster(disaster);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDisaster(null);
  };

  if (error) {
    return (
      <motion.div 
        className="bg-red-50 border border-red-200 rounded-xl p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center space-x-3">
          <span className="text-red-500 text-2xl">⚠️</span>
          <div>
            <h3 className="text-red-800 font-semibold">Failed to load recent disasters</h3>
            <p className="text-red-600 text-sm mt-1">Please check your connection and try again</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recent Disasters</h2>
          <p className="text-gray-600 text-sm mt-1">
            Latest disaster reports from around the world
          </p>
        </div>
        {disasters && disasters.length > 0 && (
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {disasters.length} disaster{disasters.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              className="animate-pulse bg-gray-200 rounded-xl h-24"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
            />
          ))}
        </div>
      ) : disasters && disasters.length > 0 ? (
        <motion.div 
          className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {disasters.map((disaster, index) => (
            <DisasterCard
              key={disaster.id}
              disaster={disaster}
              onClick={() => handleDisasterClick(disaster)}
              index={index}
            />
          ))}
        </motion.div>
      ) : (
        <motion.div 
          className="text-center py-12 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-green-200"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-6xl mb-4">🌍</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">All Clear!</h3>
          <p className="text-gray-600">No recent disasters reported</p>
          <p className="text-sm text-gray-500 mt-2">That's wonderful news for everyone!</p>
        </motion.div>
      )}

      {/* Disaster Details Modal */}
      <DisasterDetailsModal
        disaster={selectedDisaster}
        isOpen={showModal}
        onClose={handleCloseModal}
      />
    </div>
  );
};
```

## Statistics Dashboard

### StatisticsCharts Component
```typescript
// dashboard/src/components/charts/StatisticsCharts.tsx
import React from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { useSummary } from '../../hooks/useSummary';
import { useHistory } from '../../hooks/useHistory';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const chartColors = {
  red: 'rgb(239, 68, 68)',
  orange: 'rgb(249, 115, 22)',
  green: 'rgb(34, 197, 94)',
  blue: 'rgb(59, 130, 246)',
  purple: 'rgb(147, 51, 234)',
  gray: 'rgb(107, 114, 128)',
};

export const DisasterTypeChart: React.FC = () => {
  const { data: summary, isLoading } = useSummary();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!summary?.disaster_types) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Disasters by Type</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  // Process data for chart
  const typeData = summary.disaster_types.reduce((acc: any, item: any) => {
    if (!acc[item.disaster_type]) {
      acc[item.disaster_type] = { count: 0, affected: 0 };
    }
    acc[item.disaster_type].count += item.count;
    acc[item.disaster_type].affected += item.total_affected || 0;
    return acc;
  }, {});

  const chartData = {
    labels: Object.keys(typeData).map(type => type.charAt(0).toUpperCase() + type.slice(1)),
    datasets: [
      {
        label: 'Number of Disasters',
        data: Object.values(typeData).map((item: any) => item.count),
        backgroundColor: [
          chartColors.red,
          chartColors.orange,
          chartColors.green,
          chartColors.blue,
          chartColors.purple,
        ],
        borderWidth: 0,
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          afterLabel: (context: any) => {
            const type = Object.keys(typeData)[context.dataIndex];
            const affected = typeData[type].affected;
            return affected > 0 ? `Affected: ${affected.toLocaleString()}` : '';
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  return (
    <motion.div 
      className="bg-white rounded-xl shadow-sm border p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Disasters by Type</h3>
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>
    </motion.div>
  );
};

export const SeverityDistributionChart: React.FC = () => {
  const { data: summary, isLoading } = useSummary();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!summary?.severity_breakdown) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Severity Distribution</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const { severity_breakdown } = summary;
  const data = {
    labels: ['Critical', 'High Risk', 'Low Risk'],
    datasets: [
      {
        data: [
          severity_breakdown.red?.count || 0,
          severity_breakdown.orange?.count || 0,
          severity_breakdown.green?.count || 0,
        ],
        backgroundColor: [chartColors.red, chartColors.orange, chartColors.green],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label;
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <motion.div 
      className="bg-white rounded-xl shadow-sm border p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Severity Distribution</h3>
      <div className="h-64">
        <Pie data={data} options={options} />
      </div>
    </motion.div>
  );
};

export const TrendChart: React.FC = () => {
  const { data: history, isLoading } = useHistory({ days: 30 });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">30-Day Trend</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No historical data available
        </div>
      </div>
    );
  }

  // Group data by date
  const dailyData = history.reduce((acc: any, disaster: any) => {
    const date = new Date(disaster.event_timestamp).toDateString();
    if (!acc[date]) {
      acc[date] = { red: 0, orange: 0, green: 0, total: 0 };
    }
    acc[date][disaster.severity.toLowerCase()]++;
    acc[date].total++;
    return acc;
  }, {});

  const sortedDates = Object.keys(dailyData).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const data = {
    labels: sortedDates.map(date => new Date(date).toLocaleDateString()),
    datasets: [
      {
        label: 'Critical',
        data: sortedDates.map(date => dailyData[date].red),
        borderColor: chartColors.red,
        backgroundColor: chartColors.red + '20',
        fill: false,
        tension: 0.4,
      },
      {
        label: 'High Risk',
        data: sortedDates.map(date => dailyData[date].orange),
        borderColor: chartColors.orange,
        backgroundColor: chartColors.orange + '20',
        fill: false,
        tension: 0.4,
      },
      {
        label: 'Low Risk',
        data: sortedDates.map(date => dailyData[date].green),
        borderColor: chartColors.green,
        backgroundColor: chartColors.green + '20',
        fill: false,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  return (
    <motion.div 
      className="bg-white rounded-xl shadow-sm border p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">30-Day Trend</h3>
      <div className="h-64">
        <Line data={data} options={options} />
      </div>
    </motion.div>
  );
};

export const StatisticsGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="lg:col-span-2">
        <TrendChart />
      </div>
      <DisasterTypeChart />
      <SeverityDistributionChart />
    </div>
  );
};
```

## Filters and Search

### FilterControls Component
```typescript
// dashboard/src/components/dashboard/FilterControls.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, X, Globe, AlertTriangle, Calendar } from 'lucide-react';
import { useCountries } from '../../hooks/useCountries';

interface FilterState {
  search: string;
  country: string;
  severity: string;
  disasterType: string;
  dateRange: string;
}

interface FilterControlsProps {
  onFiltersChange: (filters: Partial<FilterState>) => void;
  className?: string;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  onFiltersChange,
  className = ""
}) => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    country: '',
    severity: '',
    disasterType: '',
    dateRange: '24h'
  });
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const { data: countries, isLoading: countriesLoading } = useCountries();

  const disasterTypes = [
    { value: 'earthquake', label: 'Earthquake', icon: '🌍' },
    { value: 'cyclone', label: 'Cyclone', icon: '🌪️' },
    { value: 'flood', label: 'Flood', icon: '🌊' },
    { value: 'wildfire', label: 'Wildfire', icon: '🔥' },
    { value: 'volcano', label: 'Volcano', icon: '🌋' },
  ];

  const severityLevels = [
    { value: 'RED', label: 'Critical', color: 'text-red-600' },
    { value: 'ORANGE', label: 'High Risk', color: 'text-orange-600' },
    { value: 'GREEN', label: 'Low Risk', color: 'text-green-600' },
  ];

  const dateRanges = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: 'all', label: 'All time' },
  ];

  // Count active filters
  useEffect(() => {
    const count = Object.entries(filters).filter(([key, value]) => 
      key !== 'dateRange' && value !== ''
    ).length;
    setActiveFiltersCount(count);
  }, [filters]);

  // Notify parent of filter changes
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      country: '',
      severity: '',
      disasterType: '',
      dateRange: '24h'
    });
  };

  const clearIndividualFilter = (key: keyof FilterState) => {
    handleFilterChange(key, key === 'dateRange' ? '24h' : '');
  };

  return (
    <motion.div 
      className={`bg-white rounded-xl shadow-sm border p-6 ${className}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      # GDACS Dashboard - Frontend Components Implementation Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Traffic Light Status Panel](#traffic-light-status-panel)
3. [Interactive Disaster Map](#interactive-disaster-map)
4. [Recent Disasters Timeline](#recent-disasters-timeline)
5. [Statistics Dashboard](#statistics-dashboard)
6. [Filters and Search](#filters-and-search)
7. [Common UI Components](#common-ui-components)
8. [Custom Hooks](#custom-hooks)
9. [State Management](#state-management)
10. [Performance Optimization](#performance-optimization)

## Architecture Overview

### Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Headless UI
- **State Management**: React Query + Zustand
- **Animation**: Framer Motion
- **Maps**: Mapbox GL JS
- **Charts**: Chart.js + React Chart.js 2
- **Icons**: Lucide React
- **Date Handling**: date-fns

### Component Structure
```
src/
├── components/
│   ├── common/           # Reusable UI components
│   ├── dashboard/        # Dashboard-specific components
│   ├── charts/          # Chart components
│   └── ui/              # Basic UI primitives
├── hooks/               # Custom React hooks
├── services/            # API and external services
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── styles/              # Global styles
```

## Traffic Light Status Panel

### TrafficLights Component
```typescript
// dashboard/src/components/dashboard/TrafficLights.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useSummary } from '../../hooks/useSummary';

interface TrafficLightProps {
  severity: 'red' | 'orange' | 'green';
  count: number;
  affectedPopulation: number;
  isLoading: boolean;
}

const TrafficLight: React.FC<TrafficLightProps> = ({ 
  severity, 
  count, 
  affectedPopulation, 
  isLoading 
}) => {
  const colors = {
    red: { 
      bg: 'bg-red-500', 
      text: 'text-red-900', 
      light: 'bg-red-100',
      border: 'border-red-500',
      pulse: 'shadow-red-500/50'
    },
    orange: { 
      bg: 'bg-orange-500', 
      text: 'text-orange-900', 
      light: 'bg-orange-100',
      border: 'border-orange-500',
      pulse: 'shadow-orange-500/50'
    },
    green: { 
      bg: 'bg-green-500', 
      text: 'text-green-900', 
      light: 'bg-green-100',
      border: 'border-green-500',
      pulse: 'shadow-green-500/50'
    }
  };

  const formatPopulation = (pop: number): string => {
    if (pop >= 1000000) return `${(pop / 1000000).toFixed(1)}M`;
    if (pop >= 1000) return `${(pop / 1000).toFixed(1)}K`;
    return pop.toString();
  };

  const severityLabels = {
    red: 'Critical',
    orange: 'High Risk',
    green: 'Low Risk'
  };

  return (
    <motion.div
      className={`relative p-6 rounded-xl ${colors[severity].light} border-l-4 ${colors[severity].border} backdrop-blur-sm`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      data-testid={`${severity}-alert`}
    >
      {/* Traffic Light Circle */}
      <div className="flex items-center justify-center mb-4">
        <motion.div
          className={`w-16 h-16 rounded-full ${colors[severity].bg} flex items-center justify-center shadow-lg ${colors[severity].pulse}`}
          animate={count > 0 && !isLoading ? { 
            scale: [1, 1.1, 1],
            boxShadow: [
              `0 0 0 0 rgba(${severity === 'red' ? '239, 68, 68' : severity === 'orange' ? '249, 115, 22' : '34, 197, 94'}, 0)`,
              `0 0 0 10px rgba(${severity === 'red' ? '239, 68, 68' : severity === 'orange' ? '249, 115, 22' : '34, 197, 94'}, 0.1)`,
              `0 0 0 0 rgba(${severity === 'red' ? '239, 68, 68' : severity === 'orange' ? '249, 115, 22' : '34, 197, 94'}, 0)`
            ]
          } : {}}
          transition={{ 
            repeat: count > 0 && !isLoading ? Infinity : 0, 
            duration: 2,
            ease: "easeInOut"
          }}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          ) : (
            <span className="text-white text-2xl font-bold">
              {count}
            </span>
          )}
        </motion.div>
      </div>

      {/* Status Information */}
      <div className="text-center">
        <h3 className={`text-lg font-semibold ${colors[severity].text} uppercase tracking-wide mb-2`}>
          {severity} Alerts
        </h3>
        
        <p className="text-sm text-gray-600 mb-2">
          {severityLabels[severity]}
        </p>
        
        {!isLoading && (
          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-sm font-medium text-gray-700">
              {count === 0 ? 'No active alerts' : `${count} active alert${count !== 1 ? 's' : ''}`}
            </p>
            
            {affectedPopulation > 0 && (
              <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
                <span>👥</span>
                <span>{formatPopulation(affectedPopulation)} people affected</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Trend Indicator */}
        {!isLoading && count > 0 && (
          <motion.div 
            className="mt-3 flex items-center justify-center space-x-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className={`w-2 h-2 rounded-full ${colors[severity].bg}`}></div>
            <span className="text-xs text-gray-500">Active monitoring</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export const TrafficLights: React.FC = () => {
  const { data: summary, isLoading, error, isRefetching } = useSummary({
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (error) {
    return (
      <motion.div 
        className="bg-red-50 border border-red-200 rounded-lg p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center space-x-2">
          <span className="text-red-500">⚠️</span>
          <p className="text-red-800 font-medium">Failed to load disaster summary</p>
        </div>
        <p className="text-red-600 text-sm mt-1">Please try refreshing the page</p>
      </motion.div>
    );
  }

  const severityData = summary?.severity_breakdown || {
    red: { count: 0, affected_population: 0 },
    orange: { count: 0, affected_population: 0 },
    green: { count: 0, affected_population: 0 }
  };

  const totalDisasters = Object.values(severityData).reduce((sum, data) => sum + data.count, 0);

  return (
    <div className="space-y-4" data-testid="traffic-lights">
      {/* Header with refresh indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Global Alert Status</h2>
        {isRefetching && (
          <motion.div 
            className="flex items-center space-x-2 text-sm text-gray-500"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Updating...</span>
          </motion.div>
        )}
      </div>

      {/* Summary Stats */}
      {!isLoading && summary && (
        <motion.div 
          className="bg-gray-50 rounded-lg p-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalDisasters}</p>
              <p className="text-sm text-gray-600">Total Active</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totals?.total_affected_population?.toLocaleString() || 0}
              </p>
              <p className="text-sm text-gray-600">People Affected</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.recent_24h || 0}</p>
              <p className="text-sm text-gray-600">Last 24h</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {summary.last_updated ? new Date(summary.last_updated).toLocaleTimeString() : '--:--'}
              </p>
              <p className="text-sm text-gray-600">Last Updated</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Traffic Light Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TrafficLight
          severity="red"
          count={severityData.red.count}
          affectedPopulation={severityData.red.affected_population}
          isLoading={isLoading}
        />
        <TrafficLight
          severity="orange"
          count={severityData.orange.count}
          affectedPopulation={severityData.orange.affected_population}
          isLoading={isLoading}
        />
        <TrafficLight
          severity="green"
          count={severityData.green.count}
          affectedPopulation={severityData.green.affected_population}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
```

## Interactive Disaster Map

### DisasterMap Component
```typescript
// dashboard/src/components/dashboard/DisasterMap.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { useDisasters } from '../../hooks/useDisasters';
import { DisasterAPIData } from '../../types/api';
import { motion } from 'framer-motion';

// Ensure Mapbox token is set
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

interface DisasterMapProps {
  selectedCountry?: string;
  selectedSeverity?: string;
  selectedType?: string;
  onDisasterClick?: (disaster: DisasterAPIData) => void;
  className?: string;
}

interface MapState {
  isLoaded: boolean;
  error: string | null;
  markersCount: number;
}

export const DisasterMap: React.FC<DisasterMapProps> = ({
  selectedCountry,
  selectedSeverity,
  selectedType,
  onDisasterClick,
  className = ""
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapState, setMapState] = useState<MapState>({
    isLoaded: false,
    error: null,
    markersCount: 0
  });
  
  const { data: disasters, isLoading, error: dataError } = useDisasters({
    country: selectedCountry,
    severity: selectedSeverity,
    disaster_type: selectedType,
    limit: 1000 // Get all disasters for map
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!mapboxgl.accessToken) {
      setMapState(prev => ({ ...prev, error: 'Mapbox access token not configured' }));
      return;
    }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [0, 20],
        zoom: 2,
        maxZoom: 15,
        minZoom: 1,
        attributionControl: false
      });

      // Add controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      
      // Add attribution control at bottom left
      map.current.addControl(
        new mapboxgl.AttributionControl({
          compact: true,
          customAttribution: '© GDACS'
        }),
        'bottom-left'
      );

      map.current.on('load', () => {
        setMapState(prev => ({ ...prev, isLoaded: true, error: null }));
      });

      map.current.on('error', (e) => {
        setMapState(prev => ({ ...prev, error: 'Failed to load map' }));
        console.error('Map error:', e);
      });

    } catch (error) {
      setMapState(prev => ({ ...prev, error: 'Failed to initialize map' }));
      console.error('Map initialization error:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Create disaster marker
  const createDisasterMarker = useCallback((disaster: DisasterAPIData): mapboxgl.Marker => {
    const el = document.createElement('div');
    el.className = 'disaster-marker';
    
    const severityColors = {
      RED: '#ef4444',
      ORANGE: '#f97316', 
      GREEN: '#22c55e'
    };
    
    const disasterIcons = {
      earthquake: '🌍',
      cyclone: '🌪️',
      flood: '🌊',
      wildfire: '🔥',
      volcano: '🌋'
    };

    const size = disaster.severity === 'RED' ? 50 : disaster.severity === 'ORANGE' ? 45 : 40;
    const pulseAnimation = disaster.severity === 'RED' ? 'animate-pulse' : '';

    el.innerHTML = `
      <div class="marker-content ${pulseAnimation}" style="
        background-color: ${severityColors[disaster.severity]};
        border: 3px solid white;
        border-radius: 50%;
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${size * 0.4}px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.2s ease;
        position: relative;
        z-index: 10;
      ">
        ${disasterIcons[disaster.disaster_type] || '⚠️'}
      </div>
    `;

    // Hover effects
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.2)';
      el.style.zIndex = '20';
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)';
      el.style.zIndex = '10';
    });

    // Click handler
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onDisasterClick?.(disaster);
    });

    // Create popup with detailed information
    const popup = new mapboxgl.Popup({ 
      offset: 25,
      className: 'disaster-popup'
    }).setHTML(`
      <div class="p-3 max-w-sm">
        <div class="flex items-center space-x-2 mb-2">
          <span class="text-xl">${disasterIcons[disaster.disaster_type] || '⚠️'}</span>
          <h3 class="font-semibold text-lg text-gray-900">${disaster.title}</h3>
        </div>
        
        <div class="space-y-2 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-gray-600">Location:</span>
            <span class="font-medium">${disaster.location}</span>
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-gray-600">Severity:</span>
            <span class="px-2 py-1 rounded text-xs font-medium" style="
              background-color: ${severityColors[disaster.severity]}20;
              color: ${severityColors[disaster.severity]};
              border: 1px solid ${severityColors[disaster.severity]}40;
            ">${disaster.severity}</span>
          </div>
          
          ${disaster.magnitude ? `
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Magnitude:</span>
              <span class="font-medium">${disaster.magnitude}</span>
            </div>
          ` : ''}
          
          ${disaster.wind_speed ? `
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Wind Speed:</span>
              <span class="font-medium">${disaster.wind_speed} km/h</span>
            </div>
          ` : ''}
          
          ${disaster.affected_population > 0 ? `
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Affected:</span>
              <span class="font-medium">${disaster.affected_population.toLocaleString()} people</span>
            </div>
          ` : ''}
          
          <div class="flex items-center justify-between">
            <span class="text-gray-600">Time:</span>
            <span class="font-medium">${new Date(disaster.event_timestamp).toLocaleDateString()} ${new Date(disaster.event_timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
        
        <div class="mt-3 pt-2 border-t border-gray-100">
          <p class="text-xs text-gray-500 italic">${disaster.description}</p>
        </div>
      </div>
    `);

    return new mapboxgl.Marker(el)
      .setLngLat([disaster.coordinates!.lng, disaster.coordinates!.lat])
      .setPopup(popup);
  }, [onDisasterClick]);

  // Update markers when disasters data changes
  useEffect(() => {
    if (!map.current || !mapState.isLoaded || !disasters) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    const validDisasters = disasters.filter(d => d.coordinates);
    
    validDisasters.forEach(disaster => {
      try {
        const marker = createDisasterMarker(disaster);
        marker.addTo(map.current!);
        markersRef.current.push(marker);
      } catch (error) {
        console.warn('Failed to create marker for disaster:', disaster.id, error);
      }
    });

    setMapState(prev => ({ ...prev, markersCount: validDisasters.length }));

    // Fit map to show all markers if we have disasters
    if (validDisasters.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      
      validDisasters.forEach(disaster => {
        if (disaster.coordinates) {
          bounds.extend([disaster.coordinates.lng, disaster.coordinates.lat]);
        }
      });
      
      // Only fit bounds if we have valid bounds
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 10,
          duration: 1000
        });
      }
    } else {
      // Reset to world view if no disasters
      map.current.easeTo({
        center: [0, 20],
        zoom: 2,
        duration: 1000
      });
    }
  }, [disasters, mapState.isLoaded, createDisasterMarker]);

  // Handle data loading error
  const hasError = mapState.error || dataError;

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full h-96 md:h-[500px] rounded-lg border border-gray-200 bg-gray-100"
        data-testid="disaster-map"
      />
      
      {/* Loading Overlay */}
      {(isLoading || !mapState.isLoaded) && !hasError && (
        <div className="absolute inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center rounded-lg backdrop-blur-sm">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <div className="absolute inset-0 rounded-full h-12 w-12 border-t-2 border-blue-200 mx-auto animate-pulse"></div>
            </div>
            <p className="mt-4 text-gray-600 font-medium">
              {!mapState.isLoaded ? 'Loading map...' : 'Loading disasters...'}
            </p>
          </motion.div>
        </div>
      )}
      
      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <motion.div 
            className="text-center p-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Map Unavailable</h3>
            <p className="text-gray-600 mb-4">
              {mapState.error || 'Unable to load disaster data'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        </div>
      )}
      
      {/* No Data Overlay */}
      {disasters && disasters.length === 0 && !isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div 
            className="text-center p-6 bg-white bg-opacity-90 rounded-lg shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-4xl mb-2">🌍</div>
            <p className="text-gray-600 font-medium">No disasters to display</p>
            <p className="text-sm text-gray-500 mt-1">
              {selectedCountry || selectedSeverity || selectedType ? 
                'Try adjusting your filters' : 
                "That's good news!"}
            </p>
          </motion.div>
        </div>
      )}

      {/* Map Stats */}
      {mapState.isLoaded && disasters && disasters.length > 0 && (
        <motion.div 
          className="absolute top-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center space-x-2 text-sm">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="font-medium text-gray-700">
              {mapState.markersCount} disaster{mapState.markersCount !== 1 ? 's' : ''} shown
            </span>
          </div>
        </motion.div>
      )}

      {/* Map Legend */}
      <motion.div 
        className="absolute bottom-4 right-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Severity Levels</h4>
        <div className="space-y-1">
          {[
            { level: 'RED', color: '#ef4444', label: 'Critical' },
            { level: 'ORANGE', color: '#f97316', label: 'High Risk' },
            { level: 'GREEN', color: '#22c55e', label: 'Low Risk' }
          ].map(({ level, color, label }) => (
            <div key={level} className="flex items-center space-x-2 text-xs">
              <div 
                className="w-3 h-3 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: color }}
              ></div>
              <span className="text-gray-700">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
```

## Recent Disasters Timeline

### RecentDisasters Component
```typescript
// dashboard/src/components/dashboard/RecentDisasters.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDisasters } from '../../hooks/useDisasters';
import { DisasterAPIData } from '../../types/api';
import { formatDistanceToNow, format } from 'date-fns';
import { ChevronRight, MapPin, Clock, Users } from 'lucide-react';

interface DisasterCardProps {
  disaster: DisasterAPIData;
  onClick?: () => void;
  index: number;
}

const DisasterCard: React.FC<DisasterCardProps> = ({ disaster, onClick, index }) => {
  const severityColors = {
    RED: { 
      bg: 'bg-red-50', 
      border: 'border-red-200', 
      text: 'text-red-800', 
      badge: 'bg-red-500',
      accent: 'bg-red-100'
    },
    ORANGE: { 
      bg: 'bg-orange-50', 
      border: 'border-orange-200', 
      text: 'text-orange-800', 
      badge: 'bg-orange-500',
      accent: 'bg-orange-100'
    },
    GREEN: { 
      bg: 'bg-green-50', 
      border: 'border-green-200', 
      text: 'text-green-800', 
      badge: 'bg-green-500',
      accent: 'bg-green-100'
    }
  };

  const disasterIcons = {
    earthquake: '🌍',
    cyclone: '🌪️',
    flood: '🌊',
    wildfire: '🔥',
    volcano: '🌋'
  };

  const colors = severityColors[disaster.severity];
  
  return (
    <motion.div
      className={`${colors.bg} ${colors.border} border rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-300 group relative overflow-hidden`}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      data-testid="disaster-card"
    >
      {/* Animated background effect */}
      <div className={`absolute inset-0 ${colors.accent} opacity-0 group-hover:opacity-30 transition-opacity duration-300`}></div>
      
      <div className="relative z-10 flex items-start space-x-4">
        {/* Disaster Icon */}
        <div className="flex-shrink-0">
          <motion.div
            className="text-3xl"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}

            >
            {disasterIcons[disaster.disaster_type] || '⚠️'}
          </motion.div>
        </div>
        
        {/* Disaster Info */}
        <div className="flex-grow min-w-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-grow min-w-0 mr-3">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className={`font-semibold text-base ${colors.text} truncate`}>
                  {disaster.title}
                </h3>
                <motion.span 
                  className={`${colors.badge} text-white text-xs px-2 py-1 rounded-full font-medium`}
                  whileHover={{ scale: 1.05 }}
                >
                  {disaster.severity}
                </motion.span>
              </div>
              
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {disaster.description}
              </p>
            </div>
            
            <ChevronRight 
              className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" 
            />
          </div>
          
          {/* Location and Time */}
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
            <div className="flex items-center space-x-1 min-w-0 flex-1">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{disaster.location}</span>
            </div>
            
            <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
              <Clock className="w-4 h-4" />
              <span className="whitespace-nowrap">
                {formatDistanceToNow(new Date(disaster.event_timestamp), { addSuffix: true })}
              </span>
            </div>
          </div>
          
          {/* Additional Details */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-xs">
              {disaster.magnitude && (
                <div className="flex items-center space-x-1">
                  <span className="font-medium text-gray-700">Magnitude:</span>
                  <span className={`${colors.text} font-bold`}>M{disaster.magnitude}</span>
                </div>
              )}
              {disaster.wind_speed && (
                <div className="flex items-center space-x-1">
                  <span className="font-medium text-gray-700">Wind:</span>
                  <span className={`${colors.text} font-bold`}>{disaster.wind_speed}km/h</span>
                </div>
              )}
              {disaster.depth_km && (
                <div className="flex items-center space-x-1">
                  <span className="font-medium text-gray-700">Depth:</span>
                  <span className={`${colors.text} font-bold`}>{disaster.depth_km}km</span>
                </div>
              )}
            </div>
            
            {disaster.affected_population > 0 && (
              <div className="flex items-center space-x-1 text-xs">
                <Users className="w-3 h-3 text-gray-500" />
                <span className="text-gray-600 font-medium">
                  {disaster.affected_population.toLocaleString()} affected
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hover effect border */}
      <motion.div 
        className={`absolute bottom-0 left-0 h-1 ${colors.badge} rounded-full`}
        initial={{ width: 0 }}
        whileHover={{ width: "100%" }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
};

interface DisasterDetailsModalProps {
  disaster: DisasterAPIData | null;
  isOpen: boolean;
  onClose: () => void;
}

const DisasterDetailsModal: React.FC<DisasterDetailsModalProps> = ({
  disaster,
  isOpen,
  onClose
}) => {
  if (!disaster) return null;

  const severityColors = {
    RED: 'from-red-500 to-red-600',
    ORANGE: 'from-orange-500 to-orange-600',
    GREEN: 'from-green-500 to-green-600'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>
          
          {activeFiltersCount > 0 && (
            <motion.span 
              className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              {activeFiltersCount} active
            </motion.span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Clear all
            </button>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="md:hidden text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? <X className="w-5 h-5" /> : <Filter className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search disasters by location or description..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {filters.search && (
            <button
              onClick={() => clearIndividualFilter('search')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <motion.div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${
          isExpanded ? 'block' : 'hidden md:grid'
        }`}
        initial={false}
        animate={{ opacity: isExpanded ? 1 : 1 }}
      >
        {/* Country Filter */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <Globe className="w-4 h-4" />
            <span>Country</span>
          </label>
          <select
            value={filters.country}
            onChange={(e) => handleFilterChange('country', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="country-filter"
            disabled={countriesLoading}
          >
            <option value="">All Countries</option>
            {countries?.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          {filters.country && (
            <button
              onClick={() => clearIndividualFilter('country')}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear country filter
            </button>
          )}
        </div>

        {/* Severity Filter */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <AlertTriangle className="w-4 h-4" />
            <span>Severity</span>
          </label>
          <select
            value={filters.severity}
            onChange={(e) => handleFilterChange('severity', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Severities</option>
            {severityLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
          {filters.severity && (
            <button
              onClick={() => clearIndividualFilter('severity')}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear severity filter
            </button>
          )}
        </div>

        {/* Disaster Type Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Type</label>
          <select
            value={filters.disasterType}
            onChange={(e) => handleFilterChange('disasterType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            {disasterTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
          {filters.disasterType && (
            <button
              onClick={() => clearIndividualFilter('disasterType')}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear type filter
            </button>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <Calendar className="w-4 h-4" />
            <span>Time Range</span>
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {dateRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Active Filter Tags */}
      {activeFiltersCount > 0 && (
        <motion.div 
          className="mt-4 flex flex-wrap gap-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          {filters.search && (
            <FilterTag
              label={`Search: "${filters.search}"`}
              onRemove={() => clearIndividualFilter('search')}
            />
          )}
          {filters.country && (
            <FilterTag
              label={`Country: ${countries?.find(c => c.code === filters.country)?.name || filters.country}`}
              onRemove={() => clearIndividualFilter('country')}
            />
          )}
          {filters.severity && (
            <FilterTag
              label={`Severity: ${severityLevels.find(s => s.value === filters.severity)?.label}`}
              onRemove={() => clearIndividualFilter('severity')}
            />
          )}
          {filters.disasterType && (
            <FilterTag
              label={`Type: ${disasterTypes.find(t => t.value === filters.disasterType)?.label}`}
              onRemove={() => clearIndividualFilter('disasterType')}
            />
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

interface FilterTagProps {
  label: string;
  onRemove: () => void;
}

const FilterTag: React.FC<FilterTagProps> = ({ label, onRemove }) => {
  return (
    <motion.span 
      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      layout
    >
      {label}
      <button
        onClick={onRemove}
        className="ml-2 hover:text-blue-600"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.span>
  );
};
```

## Common UI Components

### Button Component
```typescript
// dashboard/src/components/ui/Button.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 disabled:bg-gray-300',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 disabled:border-blue-300 disabled:text-blue-300',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500 disabled:text-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300',
  };
  
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const classes = [
    baseClasses,
    variants[variant],
    sizes[size],
    fullWidth ? 'w-full' : '',
    className
  ].join(' ');

  return (
    <motion.button
      className={classes}
      disabled={disabled || loading}
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {!loading && icon && <span className="mr-2">{icon}</span>}
      {children}
    </motion.button>
  );
};
```

### Card Component
```typescript
// dashboard/src/components/ui/Card.tsx
import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  padding = 'md',
  onClick
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const baseClasses = [
    'bg-white rounded-xl shadow-sm border',
    paddingClasses[padding],
    hover ? 'hover:shadow-md transition-shadow duration-200' : '',
    onClick ? 'cursor-pointer' : '',
    className
  ].join(' ');

  const CardComponent = onClick ? motion.div : 'div';

  return (
    <CardComponent
      className={baseClasses}
      onClick={onClick}
      {...(onClick ? {
        whileHover: { y: -2 },
        whileTap: { y: 0 }
      } : {})}
    >
      {children}
    </CardComponent>
  );
};
```

### Badge Component
```typescript
// dashboard/src/components/ui/Badge.tsx
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'red' | 'orange' | 'green' | 'blue' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gray',
  size = 'md',
  className = ''
}) => {
  const variants = {
    red: 'bg-red-100 text-red-800 border-red-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const classes = [
    'inline-flex items-center rounded-full font-medium border',
    variants[variant],
    sizes[size],
    className
  ].join(' ');

  return (
    <span className={classes}>
      {children}
    </span>
  );
};
```

## Custom Hooks

### useDisasters Hook
```typescript
// dashboard/src/hooks/useDisasters.ts
import { useQuery } from '@tanstack/react-query';
import { DisasterAPIData, APIResponse } from '../types/api';
import { apiService } from '../services/api';

interface UseDisastersOptions {
  country?: string;
  severity?: string;
  disaster_type?: string;
  limit?: number;
  offset?: number;
  sort?: 'recent' | 'severity' | 'affected';
  enabled?: boolean;
  refetchInterval?: number;
}

export function useDisasters(options: UseDisastersOptions = {}) {
  const {
    country,
    severity,
    disaster_type,
    limit = 50,
    offset = 0,
    sort = 'recent',
    enabled = true,
    refetchInterval
  } = options;

  return useQuery<DisasterAPIData[]>({
    queryKey: ['disasters', 'current', { country, severity, disaster_type, limit, offset, sort }],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (country) params.append('country', country);
      if (severity) params.append('severity', severity);
      if (disaster_type) params.append('disaster_type', disaster_type);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await apiService.get<APIResponse<DisasterAPIData[]>>(
        `/disasters/current?${params.toString()}`
      );
      
      return response.data;
    },
    enabled,
    refetchInterval,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

### useSummary Hook
```typescript
// dashboard/src/hooks/useSummary.ts
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

interface SummaryData {
  severity_breakdown: {
    red: { count: number; affected_population: number };
    orange: { count: number; affected_population: number };
    green: { count: number; affected_population: number };
  };
  disaster_types: Array<{
    disaster_type: string;
    count: number;
    severity: string;
    total_affected: number;
  }>;
  top_affected_countries: Array<{
    country: string;
    country_name: string;
    count: number;
    total_affected: number;
  }>;
  recent_24h: number;
  totals: {
    active_disasters: number;
    total_affected_population: number;
  };
  last_updated: string;
}

interface UseSummaryOptions {
  refetchInterval?: number;
  enabled?: boolean;
}

export function useSummary(options: UseSummaryOptions = {}) {
  const { refetchInterval = 30000, enabled = true } = options;

  return useQuery<SummaryData>({
    queryKey: ['disasters', 'summary'],
    queryFn: async () => {
      const response = await apiService.get('/disasters/summary');
      return response.data;
    },
    enabled,
    refetchInterval,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### useLocalStorage Hook
```typescript
// dashboard/src/hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}
```

## State Management

### Zustand Store
```typescript
// dashboard/src/stores/appStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // UI State
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  
  // Filters
  activeFilters: {
    country?: string;
    severity?: string;
    disasterType?: string;
    dateRange?: string;
  };
  
  // User Preferences
  preferences: {
    autoRefresh: boolean;
    refreshInterval: number;
    defaultMapView: 'world' | 'region';
    notificationsEnabled: boolean;
  };
  
  // Actions
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setActiveFilters: (filters: AppState['activeFilters']) => void;
  updatePreferences: (preferences: Partial<AppState['preferences']>) => void;
  clearFilters: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      sidebarOpen: false,
      theme: 'light',
      activeFilters: {},
      preferences: {
        autoRefresh: true,
        refreshInterval: 30000,
        defaultMapView: 'world',
        notificationsEnabled: false,
      },
      
      // Actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => set({ theme }),
      setActiveFilters: (filters) => set({ activeFilters: filters }),
      updatePreferences: (newPreferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        })),
      clearFilters: () => set({ activeFilters: {} }),
    }),
    {
      name: 'gdacs-app-storage',
      partialize: (state) => ({
        theme: state.theme,
        preferences: state.preferences,
      }),
    }
  )
);
```

## Performance Optimization

### Virtualization Hook
```typescript
// dashboard/src/hooks/useVirtualization.ts
import { useMemo, useState, useCallback } from 'react';

export function useVirtualization<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex + 1),
      offsetY: startIndex * itemHeight,
      totalHeight: items.length * itemHeight,
    };
  }, [items, itemHeight, containerHeight, scrollTop, overscan]);
  
  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return {
    ...visibleItems,
    onScroll,
  };
}
```

### Memoized Components
```typescript
// dashboard/src/components/dashboard/MemoizedDisasterCard.tsx
import React, { memo } from 'react';
import { DisasterAPIData } from '../../types/api';

interface DisasterCardProps {
  disaster: DisasterAPIData;
  onClick?: (disaster: DisasterAPIData) => void;
}

export const MemoizedDisasterCard = memo<DisasterCardProps>(
  ({ disaster, onClick }) => {
    // Component implementation
    return (
      <div onClick={() => onClick?.(disaster)}>
        {/* Card content */}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function
    return (
      prevProps.disaster.id === nextProps.disaster.id &&
      prevProps.disaster.updated_at === nextProps.disaster.updated_at
    );
  }
);

MemoizedDisasterCard.displayName = 'MemoizedDisasterCard';
```

## CSS Utilities

### Custom Scrollbar Styles
```css
/* dashboard/src/styles/components.css */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #f7fafc;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

/* Line clamp utility */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Animation utilities */
@keyframes pulse-ring {
  0% {
    transform: scale(0.33);
  }
  40%, 50% {
    opacity: 0;
  }
  100% {
    opacity: 0;
    transform: scale(1.2);
  }
}

.animate-pulse-ring {
  animation: pulse-ring 1.25s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
}

/* Map popup styles */
.mapboxgl-popup-content {
  border-radius: 12px !important;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
}

.mapboxgl-popup-tip {
  border-top-color: white !important;
}
```

This comprehensive frontend components guide provides all the necessary React components, hooks, and utilities needed to build the GDACS disaster monitoring dashboard. Each component is designed with:

- **Performance in mind**: Memoization, virtualization, and optimized re-renders
- **Accessibility**: Proper semantic markup and keyboard navigation
- **Responsiveness**: Mobile-first design with Tailwind CSS
- **User Experience**: Smooth animations and intuitive interactions
- **Type Safety**: Full TypeScript support throughout
- **Modularity**: Reusable components and hooks for maintainability
              <div className={`bg-gradient-to-r ${severityColors[disaster.severity]} text-white p-6`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">
                      {disaster.disaster_type === 'earthquake' ? '🌍' :
                       disaster.disaster_type === 'cyclone' ? '🌪️' :
                       disaster.disaster_type === 'flood' ? '🌊' :
                       disaster.disaster_type === 'wildfire' ? '🔥' :
                       disaster.disaster_type === 'volcano' ? '🌋' : '⚠️'}
                    </span>
                    <div>
                      <h2 className="text-2xl font-bold">{disaster.title}</h2>
                      <p className="text-white/90 text-sm">{disaster.location}</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white text-3xl font-light"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      Basic Information
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Severity:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          disaster.severity === 'RED' ? 'bg-red-100 text-red-800' :
                          disaster.severity === 'ORANGE' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {disaster.severity}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium capitalize">{disaster.disaster_type}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Event Time:</span>
                        <span className="font-medium">
                          {format(new Date(disaster.event_timestamp), 'PPpp')}
                        </span>
                      </div>
                      
                      {disaster.country && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Country:</span>
                          <span className="font-medium">{disaster.country}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Technical Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      Technical Details
                    </h3>
                    
                    <div className="space-y-3">
                      {disaster.magnitude && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Magnitude:</span>
                          <span className="font-bold text-lg">M{disaster.magnitude}</span>
                        </div>
                      )}
                      
                      {disaster.depth_km && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Depth:</span>
                          <span className="font-medium">{disaster.depth_km} km</span>
                        </div>
                      )}
                      
                      {disaster.wind_speed && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Wind Speed:</span>
                          <span className="font-bold text-lg">{disaster.wind_speed} km/h</span>
                        </div>
                      )}
                      
                      {disaster.affected_population > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">People Affected:</span>
                          <span className="font-bold text-lg text-red-600">
                            {disaster.affected_population.toLocaleString()}
                          </span>
                        </div>
                      )}
                      
                      {disaster.coordinates && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Coordinates:</span>
                          <span className="font-mono text-sm">
                            {disaster.coordinates.lat.toFixed(3)}, {disaster.coordinates.lng.toFixed(3)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {disaster.description && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                    <p className="text-gray-700 leading-relaxed">{disaster.description}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-6 pt-6 border-t flex justify-end space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  {disaster.coordinates && (
                    <button
                      onClick={() => {
                        window.open(`https://www.google.com/maps?q=${disaster.coordinates!.lat},${disaster.coordinates!.lng}`, '_blank');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View on Map
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const RecentDisasters: React.FC = () => {
  const [selectedDisaster, setSelectedDisaster] = useState<DisasterAPIData | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  const { data: disasters, isLoading, error } = useDisasters({ 
    limit: 20,
    sort: 'recent' 
  });

  const handleDisasterClick = (disaster: DisasterAPIData) => {
    setSelectedDisaster(disaster);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDisaster(null);
  };

  if (error) {
    return (
      <motion.div 
        className="bg-red-50 border border-red-200 rounded-xl p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center space-x-3">
          <span className="text-red-500 text-2xl">⚠️</span>
          <div>
            <h3 className="text-red-800 font-semibold">Failed to load recent disasters</h3>
            <p className="text-red-600 text-sm mt-1">Please check your connection and try again</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recent Disasters</h2>
          <p className="text-gray-600 text-sm mt-1">
            Latest disaster reports from around the world
          </p>
        </div>
        {disasters && disasters.length > 0 && (
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {disasters.length} disaster{disasters.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              className="animate-pulse bg-gray-200 rounded-xl h-24"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
            />
          ))}
        </div>
      ) : disasters && disasters.length > 0 ? (
        <motion.div 
          className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {disasters.map((disaster, index) => (
            <DisasterCard
              key={disaster.id}
              disaster={disaster}
              onClick={() => handleDisasterClick(disaster)}
              index={index}
            />
          ))}
        </motion.div>
      ) : (
        <motion.div 
          className="text-center py-12 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-green-200"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-6xl mb-4">🌍</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">All Clear!</h3>
          <p className="text-gray-600">No recent disasters reported</p>
          <p className="text-sm text-gray-500 mt-2">That's wonderful news for everyone!</p>
        </motion.div>
      )}

      {/* Disaster Details Modal */}
      <DisasterDetailsModal
        disaster={selectedDisaster}
        isOpen={showModal}
        onClose={handleCloseModal}
      />
    </div>
  );
};
```

## Statistics Dashboard

### StatisticsCharts Component
```typescript
// dashboard/src/components/charts/StatisticsCharts.tsx
import React from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { useSummary } from '../../hooks/useSummary';
import { useHistory } from '../../hooks/useHistory';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const chartColors = {
  red: 'rgb(239, 68, 68)',
  orange: 'rgb(249, 115, 22)',
  green: 'rgb(34, 197, 94)',
  blue: 'rgb(59, 130, 246)',
  purple: 'rgb(147, 51, 234)',
  gray: 'rgb(107, 114, 128)',
};

export const DisasterTypeChart: React.FC = () => {
  const { data: summary, isLoading } = useSummary();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!summary?.disaster_types) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Disasters by Type</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  // Process data for chart
  const typeData = summary.disaster_types.reduce((acc: any, item: any) => {
    if (!acc[item.disaster_type]) {
      acc[item.disaster_type] = { count: 0, affected: 0 };
    }
    acc[item.disaster_type].count += item.count;
    acc[item.disaster_type].affected += item.total_affected || 0;
    return acc;
  }, {});

  const chartData = {
    labels: Object.keys(typeData).map(type => type.charAt(0).toUpperCase() + type.slice(1)),
    datasets: [
      {
        label: 'Number of Disasters',
        data: Object.values(typeData).map((item: any) => item.count),
        backgroundColor: [
          chartColors.red,
          chartColors.orange,
          chartColors.green,
          chartColors.blue,
          chartColors.purple,
        ],
        borderWidth: 0,
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          afterLabel: (context: any) => {
            const type = Object.keys(typeData)[context.dataIndex];
            const affected = typeData[type].affected;
            return affected > 0 ? `Affected: ${affected.toLocaleString()}` : '';
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  return (
    <motion.div 
      className="bg-white rounded-xl shadow-sm border p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Disasters by Type</h3>
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>
    </motion.div>
  );
};

export const SeverityDistributionChart: React.FC = () => {
  const { data: summary, isLoading } = useSummary();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!summary?.severity_breakdown) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Severity Distribution</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const { severity_breakdown } = summary;
  const data = {
    labels: ['Critical', 'High Risk', 'Low Risk'],
    datasets: [
      {
        data: [
          severity_breakdown.red?.count || 0,
          severity_breakdown.orange?.count || 0,
          severity_breakdown.green?.count || 0,
        ],
        backgroundColor: [chartColors.red, chartColors.orange, chartColors.green],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label;
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <motion.div 
      className="bg-white rounded-xl shadow-sm border p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Severity Distribution</h3>
      <div className="h-64">
        <Pie data={data} options={options} />
      </div>
    </motion.div>
  );
};

export const TrendChart: React.FC = () => {
  const { data: history, isLoading } = useHistory({ days: 30 });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">30-Day Trend</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No historical data available
        </div>
      </div>
    );
  }

  // Group data by date
  const dailyData = history.reduce((acc: any, disaster: any) => {
    const date = new Date(disaster.event_timestamp).toDateString();
    if (!acc[date]) {
      acc[date] = { red: 0, orange: 0, green: 0, total: 0 };
    }
    acc[date][disaster.severity.toLowerCase()]++;
    acc[date].total++;
    return acc;
  }, {});

  const sortedDates = Object.keys(dailyData).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const data = {
    labels: sortedDates.map(date => new Date(date).toLocaleDateString()),
    datasets: [
      {
        label: 'Critical',
        data: sortedDates.map(date => dailyData[date].red),
        borderColor: chartColors.red,
        backgroundColor: chartColors.red + '20',
        fill: false,
        tension: 0.4,
      },
      {
        label: 'High Risk',
        data: sortedDates.map(date => dailyData[date].orange),
        borderColor: chartColors.orange,
        backgroundColor: chartColors.orange + '20',
        fill: false,
        tension: 0.4,
      },
      {
        label: 'Low Risk',
        data: sortedDates.map(date => dailyData[date].green),
        borderColor: chartColors.green,
        backgroundColor: chartColors.green + '20',
        fill: false,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  return (
    <motion.div 
      className="bg-white rounded-xl shadow-sm border p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">30-Day Trend</h3>
      <div className="h-64">
        <Line data={data} options={options} />
      </div>
    </motion.div>
  );
};

export const StatisticsGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="lg:col-span-2">
        <TrendChart />
      </div>
      <DisasterTypeChart />
      <SeverityDistributionChart />
    </div>
  );
};
```

## Filters and Search

### FilterControls Component
```typescript
// dashboard/src/components/dashboard/FilterControls.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, X, Globe, AlertTriangle, Calendar } from 'lucide-react';
import { useCountries } from '../../hooks/useCountries';

interface FilterState {
  search: string;
  country: string;
  severity: string;
  disasterType: string;
  dateRange: string;
}

interface FilterControlsProps {
  onFiltersChange: (filters: Partial<FilterState>) => void;
  className?: string;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  onFiltersChange,
  className = ""
}) => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    country: '',
    severity: '',
    disasterType: '',
    dateRange: '24h'
  });
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const { data: countries, isLoading: countriesLoading } = useCountries();

  const disasterTypes = [
    { value: 'earthquake', label: 'Earthquake', icon: '🌍' },
    { value: 'cyclone', label: 'Cyclone', icon: '🌪️' },
    { value: 'flood', label: 'Flood', icon: '🌊' },
    { value: 'wildfire', label: 'Wildfire', icon: '🔥' },
    { value: 'volcano', label: 'Volcano', icon: '🌋' },
  ];

  const severityLevels = [
    { value: 'RED', label: 'Critical', color: 'text-red-600' },
    { value: 'ORANGE', label: 'High Risk', color: 'text-orange-600' },
    { value: 'GREEN', label: 'Low Risk', color: 'text-green-600' },
  ];

  const dateRanges = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: 'all', label: 'All time' },
  ];

  // Count active filters
  useEffect(() => {
    const count = Object.entries(filters).filter(([key, value]) => 
      key !== 'dateRange' && value !== ''
    ).length;
    setActiveFiltersCount(count);
  }, [filters]);

  // Notify parent of filter changes
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      country: '',
      severity: '',
      disasterType: '',
      dateRange: '24h'
    });
  };

  const clearIndividualFilter = (key: keyof FilterState) => {
    handleFilterChange(key, key === 'dateRange' ? '24h' : '');
  };

  return (
    <motion.div 
      className={`bg-white rounded-xl shadow-sm border p-6 ${className}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      # GDACS Dashboard - Frontend Components Implementation Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Traffic Light Status Panel](#traffic-light-status-panel)
3. [Interactive Disaster Map](#interactive-disaster-map)
4. [Recent Disasters Timeline](#recent-disasters-timeline)
5. [Statistics Dashboard](#statistics-dashboard)
6. [Filters and Search](#filters-and-search)
7. [Common UI Components](#common-ui-components)
8. [Custom Hooks](#custom-hooks)
9. [State Management](#state-management)
10. [Performance Optimization](#performance-optimization)

## Architecture Overview

### Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Headless UI
- **State Management**: React Query + Zustand
- **Animation**: Framer Motion
- **Maps**: Mapbox GL JS
- **Charts**: Chart.js + React Chart.js 2
- **Icons**: Lucide React
- **Date Handling**: date-fns

### Component Structure
```
src/
├── components/
│   ├── common/           # Reusable UI components
│   ├── dashboard/        # Dashboard-specific components
│   ├── charts/          # Chart components
│   └── ui/              # Basic UI primitives
├── hooks/               # Custom React hooks
├── services/            # API and external services
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── styles/              # Global styles
```

## Traffic Light Status Panel

### TrafficLights Component
```typescript
// dashboard/src/components/dashboard/TrafficLights.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useSummary } from '../../hooks/useSummary';

interface TrafficLightProps {
  severity: 'red' | 'orange' | 'green';
  count: number;
  affectedPopulation: number;
  isLoading: boolean;
}

const TrafficLight: React.FC<TrafficLightProps> = ({ 
  severity, 
  count, 
  affectedPopulation, 
  isLoading 
}) => {
  const colors = {
    red: { 
      bg: 'bg-red-500', 
      text: 'text-red-900', 
      light: 'bg-red-100',
      border: 'border-red-500',
      pulse: 'shadow-red-500/50'
    },
    orange: { 
      bg: 'bg-orange-500', 
      text: 'text-orange-900', 
      light: 'bg-orange-100',
      border: 'border-orange-500',
      pulse: 'shadow-orange-500/50'
    },
    green: { 
      bg: 'bg-green-500', 
      text: 'text-green-900', 
      light: 'bg-green-100',
      border: 'border-green-500',
      pulse: 'shadow-green-500/50'
    }
  };

  const formatPopulation = (pop: number): string => {
    if (pop >= 1000000) return `${(pop / 1000000).toFixed(1)}M`;
    if (pop >= 1000) return `${(pop / 1000).toFixed(1)}K`;
    return pop.toString();
  };

  const severityLabels = {
    red: 'Critical',
    orange: 'High Risk',
    green: 'Low Risk'
  };

  return (
    <motion.div
      className={`relative p-6 rounded-xl ${colors[severity].light} border-l-4 ${colors[severity].border} backdrop-blur-sm`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      data-testid={`${severity}-alert`}
    >
      {/* Traffic Light Circle */}
      <div className="flex items-center justify-center mb-4">
        <motion.div
          className={`w-16 h-16 rounded-full ${colors[severity].bg} flex items-center justify-center shadow-lg ${colors[severity].pulse}`}
          animate={count > 0 && !isLoading ? { 
            scale: [1, 1.1, 1],
            boxShadow: [
              `0 0 0 0 rgba(${severity === 'red' ? '239, 68, 68' : severity === 'orange' ? '249, 115, 22' : '34, 197, 94'}, 0)`,
              `0 0 0 10px rgba(${severity === 'red' ? '239, 68, 68' : severity === 'orange' ? '249, 115, 22' : '34, 197, 94'}, 0.1)`,
              `0 0 0 0 rgba(${severity === 'red' ? '239, 68, 68' : severity === 'orange' ? '249, 115, 22' : '34, 197, 94'}, 0)`
            ]
          } : {}}
          transition={{ 
            repeat: count > 0 && !isLoading ? Infinity : 0, 
            duration: 2,
            ease: "easeInOut"
          }}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          ) : (
            <span className="text-white text-2xl font-bold">
              {count}
            </span>
          )}
        </motion.div>
      </div>

      {/* Status Information */}
      <div className="text-center">
        <h3 className={`text-lg font-semibold ${colors[severity].text} uppercase tracking-wide mb-2`}>
          {severity} Alerts
        </h3>
        
        <p className="text-sm text-gray-600 mb-2">
          {severityLabels[severity]}
        </p>
        
        {!isLoading && (
          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-sm font-medium text-gray-700">
              {count === 0 ? 'No active alerts' : `${count} active alert${count !== 1 ? 's' : ''}`}
            </p>
            
            {affectedPopulation > 0 && (
              <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
                <span>👥</span>
                <span>{formatPopulation(affectedPopulation)} people affected</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Trend Indicator */}
        {!isLoading && count > 0 && (
          <motion.div 
            className="mt-3 flex items-center justify-center space-x-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className={`w-2 h-2 rounded-full ${colors[severity].bg}`}></div>
            <span className="text-xs text-gray-500">Active monitoring</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export const TrafficLights: React.FC = () => {
  const { data: summary, isLoading, error, isRefetching } = useSummary({
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (error) {
    return (
      <motion.div 
        className="bg-red-50 border border-red-200 rounded-lg p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center space-x-2">
          <span className="text-red-500">⚠️</span>
          <p className="text-red-800 font-medium">Failed to load disaster summary</p>
        </div>
        <p className="text-red-600 text-sm mt-1">Please try refreshing the page</p>
      </motion.div>
    );
  }

  const severityData = summary?.severity_breakdown || {
    red: { count: 0, affected_population: 0 },
    orange: { count: 0, affected_population: 0 },
    green: { count: 0, affected_population: 0 }
  };

  const totalDisasters = Object.values(severityData).reduce((sum, data) => sum + data.count, 0);

  return (
    <div className="space-y-4" data-testid="traffic-lights">
      {/* Header with refresh indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Global Alert Status</h2>
        {isRefetching && (
          <motion.div 
            className="flex items-center space-x-2 text-sm text-gray-500"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Updating...</span>
          </motion.div>
        )}
      </div>

      {/* Summary Stats */}
      {!isLoading && summary && (
        <motion.div 
          className="bg-gray-50 rounded-lg p-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalDisasters}</p>
              <p className="text-sm text-gray-600">Total Active</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totals?.total_affected_population?.toLocaleString() || 0}
              </p>
              <p className="text-sm text-gray-600">People Affected</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.recent_24h || 0}</p>
              <p className="text-sm text-gray-600">Last 24h</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {summary.last_updated ? new Date(summary.last_updated).toLocaleTimeString() : '--:--'}
              </p>
              <p className="text-sm text-gray-600">Last Updated</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Traffic Light Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TrafficLight
          severity="red"
          count={severityData.red.count}
          affectedPopulation={severityData.red.affected_population}
          isLoading={isLoading}
        />
        <TrafficLight
          severity="orange"
          count={severityData.orange.count}
          affectedPopulation={severityData.orange.affected_population}
          isLoading={isLoading}
        />
        <TrafficLight
          severity="green"
          count={severityData.green.count}
          affectedPopulation={severityData.green.affected_population}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
```

## Interactive Disaster Map

### DisasterMap Component
```typescript
// dashboard/src/components/dashboard/DisasterMap.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { useDisasters } from '../../hooks/useDisasters';
import { DisasterAPIData } from '../../types/api';
import { motion } from 'framer-motion';

// Ensure Mapbox token is set
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

interface DisasterMapProps {
  selectedCountry?: string;
  selectedSeverity?: string;
  selectedType?: string;
  onDisasterClick?: (disaster: DisasterAPIData) => void;
  className?: string;
}

interface MapState {
  isLoaded: boolean;
  error: string | null;
  markersCount: number;
}

export const DisasterMap: React.FC<DisasterMapProps> = ({
  selectedCountry,
  selectedSeverity,
  selectedType,
  onDisasterClick,
  className = ""
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapState, setMapState] = useState<MapState>({
    isLoaded: false,
    error: null,
    markersCount: 0
  });
  
  const { data: disasters, isLoading, error: dataError } = useDisasters({
    country: selectedCountry,
    severity: selectedSeverity,
    disaster_type: selectedType,
    limit: 1000 // Get all disasters for map
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!mapboxgl.accessToken) {
      setMapState(prev => ({ ...prev, error: 'Mapbox access token not configured' }));
      return;
    }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [0, 20],
        zoom: 2,
        maxZoom: 15,
        minZoom: 1,
        attributionControl: false
      });

      // Add controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      
      // Add attribution control at bottom left
      map.current.addControl(
        new mapboxgl.AttributionControl({
          compact: true,
          customAttribution: '© GDACS'
        }),
        'bottom-left'
      );

      map.current.on('load', () => {
        setMapState(prev => ({ ...prev, isLoaded: true, error: null }));
      });

      map.current.on('error', (e) => {
        setMapState(prev => ({ ...prev, error: 'Failed to load map' }));
        console.error('Map error:', e);
      });

    } catch (error) {
      setMapState(prev => ({ ...prev, error: 'Failed to initialize map' }));
      console.error('Map initialization error:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Create disaster marker
  const createDisasterMarker = useCallback((disaster: DisasterAPIData): mapboxgl.Marker => {
    const el = document.createElement('div');
    el.className = 'disaster-marker';
    
    const severityColors = {
      RED: '#ef4444',
      ORANGE: '#f97316', 
      GREEN: '#22c55e'
    };
    
    const disasterIcons = {
      earthquake: '🌍',
      cyclone: '🌪️',
      flood: '🌊',
      wildfire: '🔥',
      volcano: '🌋'
    };

    const size = disaster.severity === 'RED' ? 50 : disaster.severity === 'ORANGE' ? 45 : 40;
    const pulseAnimation = disaster.severity === 'RED' ? 'animate-pulse' : '';

    el.innerHTML = `
      <div class="marker-content ${pulseAnimation}" style="
        background-color: ${severityColors[disaster.severity]};
        border: 3px solid white;
        border-radius: 50%;
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${size * 0.4}px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.2s ease;
        position: relative;
        z-index: 10;
      ">
        ${disasterIcons[disaster.disaster_type] || '⚠️'}
      </div>
    `;

    // Hover effects
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.2)';
      el.style.zIndex = '20';
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)';
      el.style.zIndex = '10';
    });

    // Click handler
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onDisasterClick?.(disaster);
    });

    // Create popup with detailed information
    const popup = new mapboxgl.Popup({ 
      offset: 25,
      className: 'disaster-popup'
    }).setHTML(`
      <div class="p-3 max-w-sm">
        <div class="flex items-center space-x-2 mb-2">
          <span class="text-xl">${disasterIcons[disaster.disaster_type] || '⚠️'}</span>
          <h3 class="font-semibold text-lg text-gray-900">${disaster.title}</h3>
        </div>
        
        <div class="space-y-2 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-gray-600">Location:</span>
            <span class="font-medium">${disaster.location}</span>
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-gray-600">Severity:</span>
            <span class="px-2 py-1 rounded text-xs font-medium" style="
              background-color: ${severityColors[disaster.severity]}20;
              color: ${severityColors[disaster.severity]};
              border: 1px solid ${severityColors[disaster.severity]}40;
            ">${disaster.severity}</span>
          </div>
          
          ${disaster.magnitude ? `
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Magnitude:</span>
              <span class="font-medium">${disaster.magnitude}</span>
            </div>
          ` : ''}
          
          ${disaster.wind_speed ? `
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Wind Speed:</span>
              <span class="font-medium">${disaster.wind_speed} km/h</span>
            </div>
          ` : ''}
          
          ${disaster.affected_population > 0 ? `
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Affected:</span>
              <span class="font-medium">${disaster.affected_population.toLocaleString()} people</span>
            </div>
          ` : ''}
          
          <div class="flex items-center justify-between">
            <span class="text-gray-600">Time:</span>
            <span class="font-medium">${new Date(disaster.event_timestamp).toLocaleDateString()} ${new Date(disaster.event_timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
        
        <div class="mt-3 pt-2 border-t border-gray-100">
          <p class="text-xs text-gray-500 italic">${disaster.description}</p>
        </div>
      </div>
    `);

    return new mapboxgl.Marker(el)
      .setLngLat([disaster.coordinates!.lng, disaster.coordinates!.lat])
      .setPopup(popup);
  }, [onDisasterClick]);

  // Update markers when disasters data changes
  useEffect(() => {
    if (!map.current || !mapState.isLoaded || !disasters) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    const validDisasters = disasters.filter(d => d.coordinates);
    
    validDisasters.forEach(disaster => {
      try {
        const marker = createDisasterMarker(disaster);
        marker.addTo(map.current!);
        markersRef.current.push(marker);
      } catch (error) {
        console.warn('Failed to create marker for disaster:', disaster.id, error);
      }
    });

    setMapState(prev => ({ ...prev, markersCount: validDisasters.length }));

    // Fit map to show all markers if we have disasters
    if (validDisasters.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      
      validDisasters.forEach(disaster => {
        if (disaster.coordinates) {
          bounds.extend([disaster.coordinates.lng, disaster.coordinates.lat]);
        }
      });
      
      // Only fit bounds if we have valid bounds
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 10,
          duration: 1000
        });
      }
    } else {
      // Reset to world view if no disasters
      map.current.easeTo({
        center: [0, 20],
        zoom: 2,
        duration: 1000
      });
    }
  }, [disasters, mapState.isLoaded, createDisasterMarker]);

  // Handle data loading error
  const hasError = mapState.error || dataError;

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full h-96 md:h-[500px] rounded-lg border border-gray-200 bg-gray-100"
        data-testid="disaster-map"
      />
      
      {/* Loading Overlay */}
      {(isLoading || !mapState.isLoaded) && !hasError && (
        <div className="absolute inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center rounded-lg backdrop-blur-sm">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <div className="absolute inset-0 rounded-full h-12 w-12 border-t-2 border-blue-200 mx-auto animate-pulse"></div>
            </div>
            <p className="mt-4 text-gray-600 font-medium">
              {!mapState.isLoaded ? 'Loading map...' : 'Loading disasters...'}
            </p>
          </motion.div>
        </div>
      )}
      
      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <motion.div 
            className="text-center p-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Map Unavailable</h3>
            <p className="text-gray-600 mb-4">
              {mapState.error || 'Unable to load disaster data'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        </div>
      )}
      
      {/* No Data Overlay */}
      {disasters && disasters.length === 0 && !isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div 
            className="text-center p-6 bg-white bg-opacity-90 rounded-lg shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-4xl mb-2">🌍</div>
            <p className="text-gray-600 font-medium">No disasters to display</p>
            <p className="text-sm text-gray-500 mt-1">
              {selectedCountry || selectedSeverity || selectedType ? 
                'Try adjusting your filters' : 
                "That's good news!"}
            </p>
          </motion.div>
        </div>
      )}

      {/* Map Stats */}
      {mapState.isLoaded && disasters && disasters.length > 0 && (
        <motion.div 
          className="absolute top-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center space-x-2 text-sm">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="font-medium text-gray-700">
              {mapState.markersCount} disaster{mapState.markersCount !== 1 ? 's' : ''} shown
            </span>
          </div>
        </motion.div>
      )}

      {/* Map Legend */}
      <motion.div 
        className="absolute bottom-4 right-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Severity Levels</h4>
        <div className="space-y-1">
          {[
            { level: 'RED', color: '#ef4444', label: 'Critical' },
            { level: 'ORANGE', color: '#f97316', label: 'High Risk' },
            { level: 'GREEN', color: '#22c55e', label: 'Low Risk' }
          ].map(({ level, color, label }) => (
            <div key={level} className="flex items-center space-x-2 text-xs">
              <div 
                className="w-3 h-3 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: color }}
              ></div>
              <span className="text-gray-700">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
```

## Recent Disasters Timeline

### RecentDisasters Component
```typescript
// dashboard/src/components/dashboard/RecentDisasters.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDisasters } from '../../hooks/useDisasters';
import { DisasterAPIData } from '../../types/api';
import { formatDistanceToNow, format } from 'date-fns';
import { ChevronRight, MapPin, Clock, Users } from 'lucide-react';

interface DisasterCardProps {
  disaster: DisasterAPIData;
  onClick?: () => void;
  index: number;
}

const DisasterCard: React.FC<DisasterCardProps> = ({ disaster, onClick, index }) => {
  const severityColors = {
    RED: { 
      bg: 'bg-red-50', 
      border: 'border-red-200', 
      text: 'text-red-800', 
      badge: 'bg-red-500',
      accent: 'bg-red-100'
    },
    ORANGE: { 
      bg: 'bg-orange-50', 
      border: 'border-orange-200', 
      text: 'text-orange-800', 
      badge: 'bg-orange-500',
      accent: 'bg-orange-100'
    },
    GREEN: { 
      bg: 'bg-green-50', 
      border: 'border-green-200', 
      text: 'text-green-800', 
      badge: 'bg-green-500',
      accent: 'bg-green-100'
    }
  };

  const disasterIcons = {
    earthquake: '🌍',
    cyclone: '🌪️',
    flood: '🌊',
    wildfire: '🔥',
    volcano: '🌋'
  };

  const colors = severityColors[disaster.severity];
  
  return (
    <motion.div
      className={`${colors.bg} ${colors.border} border rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-300 group relative overflow-hidden`}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      data-testid="disaster-card"
    >
      {/* Animated background effect */}
      <div className={`absolute inset-0 ${colors.accent} opacity-0 group-hover:opacity-30 transition-opacity duration-300`}></div>
      
      <div className="relative z-10 flex items-start space-x-4">
        {/* Disaster Icon */}
        <div className="flex-shrink-0">
          <motion.div
            className="text-3xl"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}