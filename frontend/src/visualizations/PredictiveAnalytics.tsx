import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Title)

function movingAverage(values: number[], window: number) {
  const out: number[] = []
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1)
    const slice = values.slice(start, i + 1)
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length)
  }
  return out
}

export function PredictiveAnalytics() {
  const { data } = useQuery({
    queryKey: ['timeseries-90'],
    queryFn: async () => {
      const res = await api.get('/api/admin/reports/timeseries?days=90')
      return res.data?.data || []
    },
    staleTime: 10 * 60 * 1000
  })

  const labels = (data || []).map((d: any) => d.day)
  const values = (data || []).map((d: any) => d.count)
  const ma7 = movingAverage(values, 7)

  const chartData = {
    labels,
    datasets: [
      { label: 'Daily', data: values, borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.2)', fill: true, tension: 0.3 },
      { label: 'MA(7)', data: ma7, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)', fill: true, tension: 0.3 }
    ]
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Predictive Analytics</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Simple 7-day moving average as a baseline trend model.</p>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <div className="h-[60vh]">
          <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>
    </div>
  )
}
