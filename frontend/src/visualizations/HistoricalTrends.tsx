import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export function HistoricalTrends() {
  const { data } = useQuery({
    queryKey: ['timeseries-90'],
    queryFn: async () => {
      const res = await api.get('/api/admin/reports/timeseries?days=90')
      return res.data?.data || []
    },
    staleTime: 10 * 60 * 1000
  })

  // Group by week number
  const byWeek: Record<string, number> = {}
  for (const r of data || []) {
    const week = new Date(r.day)
    // ISO week approx: year-week
    const yr = week.getUTCFullYear()
    const firstJan = new Date(Date.UTC(yr, 0, 1))
    const dayOfYear = Math.floor((+week - +firstJan) / (24*3600*1000)) + 1
    const wk = Math.ceil(dayOfYear / 7)
    const key = `${yr}-W${wk.toString().padStart(2,'0')}`
    byWeek[key] = (byWeek[key] || 0) + r.count
  }
  const labels = Object.keys(byWeek)
  const counts = Object.values(byWeek)

  const chartData = {
    labels,
    datasets: [{ label: 'Events per Week', data: counts, backgroundColor: 'rgba(59,130,246,0.7)' }]
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Historical Trends</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Weekly totals over the last 90 days. Extend to multi-year when available.</p>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <div className="h-[60vh]">
          <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>
    </div>
  )
}
