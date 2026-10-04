import { useRef, useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import 'hammerjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';

const zoom = zoomPlugin.default || zoomPlugin;
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, zoom);

export default function TrendChart({ ticker, history }) {
  const chartRef = useRef(null);
  const [isZoomed, setIsZoomed] = useState(false);

  // Reset zoom when selected ticker changes
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
      setIsZoomed(false);
    }
  }, [ticker]);

  const rawData = useMemo(() => {
    if (!history || !Array.isArray(history)) return [];
    return history;
  }, [history]);

  if (!ticker) {
    return (
      <div className="trend-chart-placeholder">
        Click a ticker in the table to see its trend chart.
      </div>
    );
  }

  if (rawData.length < 2) {
    return (
      <div className="trend-chart-placeholder">
        Not enough data yet for {ticker} - waiting for more ticks.
      </div>
    );
  }

  const chartData = {
    labels: rawData.map((p) =>
      new Date(p.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    ),
    datasets: [
      {
        label: ticker,
        data: rawData.map((p) => p.price),
        borderColor: '#7c9cff',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#7c9cff',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        tension: 0.2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        ticks: { color: '#6b7280', maxTicksLimit: 6 },
        grid: { color: '#1f2530' },
      },
      y: {
        ticks: {
          color: '#6b7280',
          callback: (val) => `$${Number(val).toFixed(2)}`,
        },
        grid: { color: '#1f2530' },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#12161f',
        borderColor: '#1f2530',
        borderWidth: 1,
        titleColor: '#6b7280',
        titleFont: { family: 'IBM Plex Mono', size: 11 },
        bodyColor: '#e7eaf0',
        bodyFont: { family: 'IBM Plex Mono', size: 13, weight: '600' },
        padding: 10,
        displayColors: false,
        callbacks: {
          title: (items) => (items.length ? items[0].label : ''),
          label: (context) => `Price: $${Number(context.parsed.y).toFixed(2)}`,
        },
      },
      zoom: {
        zoom: {
          drag: {
            enabled: true,
            backgroundColor: 'rgba(124, 156, 255, 0.2)',
            borderColor: '#7c9cff',
            borderWidth: 1,
          },
          mode: 'x',
          onZoomComplete: () => {
            setIsZoomed(true);
          },
        },
      },
    },
  };

  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
      setIsZoomed(false);
    }
  };

  return (
    <div className="trend-chart">
      <div className="trend-chart-header">
        <div>
          <h2>{ticker} trend</h2>
          <span className="trend-chart-hint">Click & drag horizontally to zoom timeframe</span>
        </div>
        {isZoomed && (
          <button
            type="button"
            className="reset-zoom-btn"
            onClick={handleResetZoom}
            title="Reset to full view"
          >
            <span className="reset-icon">?</span> Reset
          </button>
        )}
      </div>
      <div className="trend-chart-canvas">
        <Line ref={chartRef} data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
