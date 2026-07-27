import { useEffect, useState } from 'react';
import WatchlistPanel from './components/WatchlistPanel';
import { useStockSocket } from './hooks/useStockSocket';
import { fetchStocks } from './api';
import { TICKERS, HISTORY_LIMIT } from './config';

function emptyState() {
  return Object.fromEntries(TICKERS.map((t) => [t, []]));
}

function appendCapped(list, point) {
  const next = [...list, point];
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
}

export default function App() {
  const [data, setData] = useState(emptyState);
  const [loadError, setLoadError] = useState(null);
  const { status, snapshot, lastUpdate } = useStockSocket();

  // Initial paint: REST call, independent of the socket connecting.
  useEffect(() => {
    fetchStocks()
      .then((byTicker) => {
        setData((prev) => ({ ...prev, ...byTicker }));
        setLoadError(null);
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  // If the channel pushes its own hydration snapshot on join, fold it in too.
  // NOTE: verify this shape against what StockFetcherWeb.StockChannel actually
  // sends in join/3 — assumed here to be either { data: [...] } like the REST
  // response, or a flat array of rows. Adjust if it differs.
  useEffect(() => {
    if (!snapshot) return;
    const rows = Array.isArray(snapshot) ? snapshot : snapshot.data ?? [];
    if (rows.length === 0) return;

    setData((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        const list = next[row.ticker] ? [...next[row.ticker]] : [];
        if (!list.some((p) => p.timestamp === row.timestamp)) {
          list.push({ price: row.price, timestamp: row.timestamp });
        }
        next[row.ticker] = list.sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
      }
      return next;
    });
  }, [snapshot]);

  // Live ticks pushed from :new_price broadcasts.
  useEffect(() => {
    if (!lastUpdate) return;
    const { ticker, price, timestamp } = lastUpdate;
    if (!ticker) return;

    setData((prev) => ({
      ...prev,
      [ticker]: appendCapped(prev[ticker] ?? [], { price, timestamp }),
    }));
  }, [lastUpdate]);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Capstock</h1>
          <div className="subtitle">Live watchlist — AAPL, MSFT, GOOGL, AMZN, TSLA</div>
        </div>
        <span className="status-pill" data-status={status}>
          <span className="status-dot" />
          {status}
        </span>
      </header>

      {loadError && (
        <div className="error-banner">
          Couldn't load initial data ({loadError}). Live updates will still
          appear once the socket connects.
        </div>
      )}

      <WatchlistPanel data={data} />
    </div>
  );
}
