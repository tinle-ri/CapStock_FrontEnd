import { API_BASE } from './config';

// backend now returns data pre-grouped by ticker:
// { data: { AAPL: [...], MSFT: [...], ... } }
// each ticker's array is a list of { ticker, price, timestamp } points
export async function fetchStocks() {
  const res = await fetch(`${API_BASE}/api/stocks`);

  if (!res.ok) {
    throw new Error(`GET /api/stocks failed: ${res.status}`);
  }

  const { data } = await res.json();
  const byTicker = {};

  for (const ticker in data) {
    // oldest first so the chart draws left to right
    byTicker[ticker] = [...data[ticker]].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
  }

  return byTicker;
}
