import React from 'react'
import { AlertTriangle, MapPin, Clock, Users, Activity } from 'lucide-react'
import { useDisastersWithMeta } from '@/hooks/useDisastersWithMeta'
import type { Disaster } from '@/hooks/useDisasters'

// Extended disaster type for critical events with additional fields from API
interface CriticalEventData extends Disaster {
  affected_population?: number
  magnitude?: number
  wind_speed?: number
  depth_km?: number
}

const severityConfig = {
  red: { label: 'CRITICAL', bgColor: 'bg-red-500', textColor: 'text-white', borderColor: 'border-red-500' },
  yellow: { label: 'HIGH', bgColor: 'bg-yellow-500', textColor: 'text-black', borderColor: 'border-yellow-500' },
  green: { label: 'MODERATE', bgColor: 'bg-green-500', textColor: 'text-white', borderColor: 'border-green-500' }
}

const typeIcons = {
  earthquake: '🌍',
  cyclone: '🌀',
  flood: '🌊',
  wildfire: '🔥',
  landslide: '⛰️',
  drought: '🏜️',
  other: '⚠️'
}

function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const eventTime = new Date(dateString)
  const diffMs = now.getTime() - eventTime.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export default function CriticalEvents() {
  // Fetch only critical (red) and high (yellow) severity events
  const { data: disasters, isLoading, error } = useDisastersWithMeta({
    limit: 20,
    severity: 'red,yellow', // Only fetch critical and high severity
    sort: 'occurred_at'
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900">Critical Events</h3>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900">Critical Events</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>Failed to load critical events</p>
        </div>
      </div>
    )
  }

  const criticalEvents = disasters?.items || []
  const criticalCount = criticalEvents.filter((e: Disaster) => e.severity === 'red').length
  const highCount = criticalEvents.filter((e: Disaster) => e.severity === 'yellow').length

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">Critical Events</h3>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-gray-600">{criticalCount} Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-600">{highCount} High</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {criticalEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <p className="font-medium text-green-600">No Critical Events</p>
            <p className="text-sm text-gray-500 mt-1">All monitored events are below critical threshold</p>
          </div>
        ) : (
          <div className="space-y-4">
            {criticalEvents.map((event: CriticalEventData) => {
              const severity = severityConfig[event.severity as keyof typeof severityConfig]
              const typeIcon = typeIcons[event.type as keyof typeof typeIcons] || typeIcons.other
              
              return (
                <div
                  key={event.id}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${severity.borderColor} border-l-4`}
                >
                  {/* Event Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{typeIcon}</span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severity.bgColor} ${severity.textColor}`}>
                            {severity.label}
                          </span>
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {event.type}
                          </span>
                        </div>
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                          {event.title}
                        </h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap ml-4">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(event.occurred_at)}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{event.country}</span>
                      {event.latitude && event.longitude && (
                        <span className="text-gray-400">
                          ({event.latitude.toFixed(2)}, {event.longitude.toFixed(2)})
                        </span>
                      )}
                    </div>
                    
                    {(event as any).affected_population && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{formatNumber((event as any).affected_population)} affected</span>
                      </div>
                    )}
                  </div>


                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        {criticalEvents.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="text-xs text-gray-500 text-center">
              Showing {criticalEvents.length} most recent critical and high-severity events
            </div>
          </div>
        )}
      </div>
    </div>
  )
}