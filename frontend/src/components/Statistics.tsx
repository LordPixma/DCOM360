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
        backgroundColor: 'rgba(59, 130, 246, 0.6)'
      }
    ]
  }

  const pieData = {
    labels,
    datasets: [
      {
        label: 'Share',
        data: counts,
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)',
          'rgba(34, 197, 94, 0.7)',
          'rgba(234, 179, 8, 0.7)',
          'rgba(239, 68, 68, 0.7)',
          'rgba(147, 51, 234, 0.7)'
        ]
      }
    ]
  }

  return (
    <section className="bg-white border rounded-lg p-4">
      <h2 className="font-semibold mb-4">Statistics</h2>
      {isLoading ? (
        <div className="text-sm text-gray-500">Loading charts…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false }} height={220} />
          </div>
          <div>
            <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false }} height={220} />
          </div>
        </div>
      )}
    </section>
  )
}
