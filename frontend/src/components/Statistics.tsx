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
  backgroundColor: '#0066FF'
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
          '#0066FF', '#00D4AA', '#FF8800', '#8B5CF6', '#F59E0B'
        ]
      }
    ]
  }

  return (
    <section className="bg-white border rounded-lg shadow-sm p-4">
      <h2 className="font-semibold mb-4">Analytics</h2>
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
