import { API_BASE } from './config';

/**
 * Fetches recent price rows from GET /api/stocks and groups them by ticker,
 * newest first. The backend returns a flat array of
 * { id, timestamp, ticker, price } rows across all tickers, so this is
 * where that flat shape becomes { AAPL: [...], MSFT: [...], ... }.
 */
export async function fetchStocks() {
  const res = await fetch(`${API_BASE}/api/stocks`);

  if (!res.ok) {
    throw new Error(`GET /api/stocks failed with status ${res.status}`);
  }

  const { data } = await res.json();
  const byTicker = {};

  for (const row of data) {
    const list = byTicker[row.ticker] ?? (byTicker[row.ticker] = []);
    list.push(row);
  }

  for (const ticker of Object.keys(byTicker)) {
    byTicker[ticker].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
  }

  return byTicker;
}
