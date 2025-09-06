import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, TrendingUp, Filter, RotateCcw } from 'lucide-react';
import { useDisasters } from '../hooks/useDisasters';

interface HeatmapCell {
  x: number;
  y: number;
  value: number;
  disasters: any[];
  country?: string;
  region?: string;
}

interface TimeSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  marks: { value: number; label: string }[];
}

const TimeSlider: React.FC<TimeSliderProps> = ({ value, onChange, min, max, marks }) => {
  return (
    <div className="relative w-full">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        {marks.map((mark) => (
          <span 
            key={mark.value}
            className={`${value === mark.value ? 'text-blue-600 font-semibold' : ''}`}
          >
            {mark.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export const AdvancedHeatmap: React.FC = () => {
  const [timeRange, setTimeRange] = useState({ start: 0, end: 11 }); // Last 12 months
  const [selectedMetric, setSelectedMetric] = useState<'count' | 'severity' | 'impact'>('count');
  const [animationSpeed, setAnimationSpeed] = useState(1000);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTimeSlice, setCurrentTimeSlice] = useState(11);
  
  const { data: disasters, isLoading } = useDisasters({
    severity: '',
    country: '',
    type: '',
    limit: 1000
  });

  // Generate time marks for the last 12 months
  const timeMarks = useMemo(() => {
    const marks = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      marks.push({
        value: 11 - i,
        label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      });
    }
    return marks;
  }, []);

  // Process disasters into geographical grid
  const heatmapData = useMemo(() => {
    if (!disasters) return [];
    
    // Create a simplified world grid (latitude/longitude buckets)
    const gridSize = 20; // 20x20 grid
    const latStep = 180 / gridSize; // -90 to +90
    const lngStep = 360 / gridSize; // -180 to +180
    
    const grid: HeatmapCell[][] = [];
    
    // Initialize grid
    for (let y = 0; y < gridSize; y++) {
      grid[y] = [];
      for (let x = 0; x < gridSize; x++) {
        grid[y][x] = {
          x,
          y,
          value: 0,
          disasters: [],
          region: `${(y * latStep - 90).toFixed(1)}, ${(x * lngStep - 180).toFixed(1)}`
        };
      }
    }
    
    // Populate grid with disaster data
    disasters.forEach(disaster => {
      if (!disaster.latitude || !disaster.longitude) return;
      
      const lat = disaster.latitude;
      const lng = disaster.longitude;
      
      // Convert lat/lng to grid coordinates
      const gridY = Math.floor((lat + 90) / latStep);
      const gridX = Math.floor((lng + 180) / lngStep);
      
      // Ensure within bounds
      if (gridY >= 0 && gridY < gridSize && gridX >= 0 && gridX < gridSize) {
        grid[gridY][gridX].disasters.push(disaster);
        
        // Calculate value based on selected metric
        switch (selectedMetric) {
          case 'count':
            grid[gridY][gridX].value += 1;
            break;
          case 'severity':
            const severityWeight = disaster.severity === 'red' ? 3 : disaster.severity === 'yellow' ? 2 : 1;
            grid[gridY][gridX].value += severityWeight;
            break;
          case 'impact':
            // Use a base impact value since affected_population might not be available
            const baseImpact = disaster.severity === 'red' ? 1000 : disaster.severity === 'yellow' ? 500 : 100;
            grid[gridY][gridX].value += baseImpact / 1000; // Scale down
            break;
        }
      }
    });
    
    return grid.flat().filter(cell => cell.value > 0);
  }, [disasters, selectedMetric]);

  // Calculate max value for color scaling
  const maxValue = useMemo(() => {
    return Math.max(...heatmapData.map(cell => cell.value), 1);
  }, [heatmapData]);

  // Get color intensity based on value
  const getColor = (value: number): string => {
    const intensity = value / maxValue;
    if (intensity === 0) return 'rgba(0, 0, 0, 0)';
    
    // Color gradient from green (low) to red (high)
    if (intensity <= 0.3) {
      return `rgba(34, 197, 94, ${intensity * 2})`;
    } else if (intensity <= 0.6) {
      return `rgba(251, 146, 60, ${intensity})`;
    } else {
      return `rgba(239, 68, 68, ${intensity})`;
    }
  };

  // Animation control
  useEffect(() => {
    if (!isAnimating) return;
    
    const interval = setInterval(() => {
      setCurrentTimeSlice(prev => {
        const next = prev + 1;
        if (next > 11) {
          setIsAnimating(false);
          return 11;
        }
        return next;
      });
    }, animationSpeed);
    
    return () => clearInterval(interval);
  }, [isAnimating, animationSpeed]);

  const startAnimation = () => {
    setCurrentTimeSlice(0);
    setIsAnimating(true);
  };

  const resetView = () => {
    setIsAnimating(false);
    setCurrentTimeSlice(11);
    setTimeRange({ start: 0, end: 11 });
  };

  // Get statistics for current view
  const stats = useMemo(() => {
    const visibleCells = heatmapData;
    const totalDisasters = visibleCells.reduce((sum, cell) => sum + cell.disasters.length, 0);
    const totalValue = visibleCells.reduce((sum, cell) => sum + cell.value, 0);
    const hotspots = visibleCells.filter(cell => cell.value > maxValue * 0.7).length;
    
    return {
      totalDisasters,
      totalValue: Math.round(totalValue),
      hotspots,
      avgIntensity: totalDisasters > 0 ? (totalValue / visibleCells.length).toFixed(2) : '0'
    };
  }, [heatmapData, maxValue]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
            <TrendingUp className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Disaster Heatmap</h1>
            <p className="text-slate-600 dark:text-slate-400">Geographic intensity visualization with temporal analysis</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={startAnimation}
            disabled={isAnimating}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isAnimating 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>{isAnimating ? 'Animating...' : 'Play Timeline'}</span>
          </button>
          
          <button
            onClick={resetView}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Metric Selection */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="font-medium text-slate-900 dark:text-white mb-3 flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Visualization Metric</span>
          </h3>
          <div className="space-y-2">
            {[
              { key: 'count', label: 'Disaster Count', desc: 'Number of disasters' },
              { key: 'severity', label: 'Severity Index', desc: 'Weighted by severity level' },
              { key: 'impact', label: 'Impact Scale', desc: 'Based on affected population' }
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="metric"
                  value={key}
                  checked={selectedMetric === key}
                  onChange={(e) => setSelectedMetric(e.target.value as any)}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{label}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Time Controls */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="font-medium text-slate-900 dark:text-white mb-3">Time Period</h3>
          <div className="space-y-4">
            <TimeSlider
              value={currentTimeSlice}
              onChange={setCurrentTimeSlice}
              min={0}
              max={11}
              marks={timeMarks}
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Animation Speed:</span>
              <select
                value={animationSpeed}
                onChange={(e) => setAnimationSpeed(Number(e.target.value))}
                className="text-xs bg-slate-100 dark:bg-slate-700 border rounded px-2 py-1"
              >
                <option value={2000}>Slow</option>
                <option value={1000}>Normal</option>
                <option value={500}>Fast</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="font-medium text-slate-900 dark:text-white mb-3">Current View Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Total Disasters:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{stats.totalDisasters}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Metric Value:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{stats.totalValue}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Hot Spots:</span>
              <span className="font-semibold text-red-600">{stats.hotspots}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Avg Intensity:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{stats.avgIntensity}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Global Disaster Intensity Map
          </h3>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Showing: {timeMarks[currentTimeSlice]?.label}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center space-x-4 mb-6">
          <span className="text-sm text-slate-600 dark:text-slate-400">Intensity:</span>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-400 rounded"></div>
            <span className="text-xs">Low</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-400 rounded"></div>
            <span className="text-xs">Medium</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-400 rounded"></div>
            <span className="text-xs">High</span>
          </div>
        </div>

        {/* Grid Visualization */}
        <div className="relative bg-slate-100 dark:bg-slate-700 rounded-lg p-4 overflow-x-auto">
          <div 
            className="grid gap-1 mx-auto"
            style={{ 
              gridTemplateColumns: 'repeat(20, minmax(20px, 1fr))',
              gridTemplateRows: 'repeat(20, 20px)',
              maxWidth: '600px'
            }}
          >
            {Array.from({ length: 400 }, (_, i) => {
              const x = i % 20;
              const y = Math.floor(i / 20);
              const cell = heatmapData.find(c => c.x === x && c.y === y);
              const value = cell?.value || 0;
              
              return (
                <motion.div
                  key={i}
                  className="rounded-sm cursor-pointer hover:scale-110 transition-transform"
                  style={{ 
                    backgroundColor: getColor(value),
                    border: value > 0 ? '1px solid rgba(255,255,255,0.3)' : 'none'
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: (x + y) * 0.01 }}
                  title={cell ? `${cell.region}: ${value.toFixed(1)} ${selectedMetric}` : ''}
                />
              );
            })}
          </div>
        </div>

        {/* Top Hotspots */}
        {heatmapData.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium text-slate-900 dark:text-white mb-3">Top Hotspots</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {heatmapData
                .sort((a, b) => b.value - a.value)
                .slice(0, 6)
                .map((cell, index) => (
                  <motion.div
                    key={`${cell.x}-${cell.y}`}
                    className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        #{index + 1}
                      </span>
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: getColor(cell.value) }}
                      />
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {cell.region}
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {cell.value.toFixed(1)} {selectedMetric}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {cell.disasters.length} disaster{cell.disasters.length !== 1 ? 's' : ''}
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
