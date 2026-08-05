import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement);

// trend chart for whichever ticker is currently selected (REQ-FRONT-03)
export default function TrendChart({ ticker, history }) {
  if (!ticker) {
    return (
      <div className="trend-chart-placeholder">
        Click a ticker in the table to see its trend chart.
      </div>
    );
  }

  if (!history || history.length < 2) {
    return (
      <div className="trend-chart-placeholder">
        Not enough data yet for {ticker} — waiting for more ticks.
      </div>
    );
  }

  const chartData = {
    labels: history.map((p) => new Date(p.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: ticker,
        data: history.map((p) => p.price),
        borderColor: '#7c9cff',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: { ticks: { color: '#6b7280', maxTicksLimit: 6 }, grid: { color: '#1f2530' } },
      y: { ticks: { color: '#6b7280' }, grid: { color: '#1f2530' } },
    },
    plugins: { legend: { display: false } },
  };

  return (
    <div className="trend-chart">
      <h2>{ticker} trend</h2>
      <div className="trend-chart-canvas">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
