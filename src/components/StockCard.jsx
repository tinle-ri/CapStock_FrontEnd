import { useEffect, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler);

/**
 * @param {string} ticker
 * @param {{price: number, timestamp: string}[]} history - oldest first
 */
export default function StockCard({ ticker, history }) {
  const [flash, setFlash] = useState(null); // 'up' | 'down' | null
  const prevPriceRef = useRef(null);
  const flashTimeoutRef = useRef(null);

  const latest = history[history.length - 1];
  const previous = history.length > 1 ? history[history.length - 2] : null;

  useEffect(() => {
    if (!latest) return;

    if (prevPriceRef.current != null && latest.price !== prevPriceRef.current) {
      const direction = latest.price > prevPriceRef.current ? 'up' : 'down';
      setFlash(direction);

      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => setFlash(null), 900);
    }

    prevPriceRef.current = latest.price;

    return () => clearTimeout(flashTimeoutRef.current);
  }, [latest?.price]);

  if (!latest) {
    return (
      <div className="stock-card">
        <div className="stock-card-head">
          <span className="stock-ticker">{ticker}</span>
        </div>
        <div className="stock-price" style={{ color: 'var(--text-muted)' }}>
          --
        </div>
      </div>
    );
  }

  const delta = previous ? latest.price - previous.price : 0;
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : null;

  const chartData = {
    labels: history.map((p) => p.timestamp),
    datasets: [
      {
        data: history.map((p) => p.price),
        borderColor: direction === 'down' ? '#f87171' : '#34d399',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
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
      x: { display: false },
      y: { display: false },
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  return (
    <div className="stock-card" data-flash={flash ?? undefined}>
      <div className="stock-card-head">
        <span className="stock-ticker">{ticker}</span>
        {direction && (
          <span className="stock-delta" data-direction={direction}>
            {direction === 'up' ? '▲' : '▼'} {Math.abs(delta).toFixed(2)}
          </span>
        )}
      </div>

      <div className="stock-price" data-flash={flash ?? undefined}>
        ${latest.price.toFixed(2)}
      </div>

      <div className="stock-chart">
        {history.length > 1 && <Line data={chartData} options={chartOptions} />}
      </div>

      <div className="stock-timestamp">
        {new Date(latest.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
