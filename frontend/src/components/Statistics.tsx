import { Bar, Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js'
import { useSummary } from '@/hooks/useSummary'
import { BarChart3, PieChart, TrendingUp } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title)

export function Statistics() {
  const { data, isLoading } = useSummary()
  const labels = data?.totals.map(t => t.type) ?? []
  const counts = data?.totals.map(t => t.count) ?? []

  const barData = {
    labels,
    datasets: [
      {
        label: 'Events by Type',
        data: counts,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
        borderRadius: 8,
        borderSkipped: false,
      }
    ]
  }

  const pieData = {
    labels,
    datasets: [
      {
        label: 'Distribution',
        data: counts,
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',   // red
          'rgba(245, 158, 11, 0.8)',  // orange  
          'rgba(16, 185, 129, 0.8)',  // green
          'rgba(139, 92, 246, 0.8)',  // purple
          'rgba(59, 130, 246, 0.8)',  // blue
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(245, 158, 11)',
          'rgb(16, 185, 129)',
          'rgb(139, 92, 246)',
          'rgb(59, 130, 246)',
        ],
        borderWidth: 2,
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        cornerRadius: 8,
        padding: 12
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.1)'
        },
        ticks: {
          color: 'rgb(100, 116, 139)'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgb(100, 116, 139)'
        }
      }
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Analytics</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Event distribution and trends</p>
          </div>
        </div>
      </div>
      
      <div className="p-6">
    {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-slate-300 border-t-purple-600 rounded-full mx-auto mb-3"></div>
      <p className="text-sm text-slate-500 dark:text-slate-400">Loading charts...</p>
            </div>
          </div>
        ) : !data?.totals.length ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No data available</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Charts will appear when events are available</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <h4 className="font-semibold text-slate-900 dark:text-white">Events by Type</h4>
              </div>
              <div className="h-64">
                <Bar data={barData} options={chartOptions} />
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <h4 className="font-semibold text-slate-900 dark:text-white">Distribution</h4>
              </div>
              <div className="h-64">
                <Pie data={pieData} options={chartOptions} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
