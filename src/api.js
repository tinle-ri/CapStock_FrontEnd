import { API_BASE } from './config';

// Grabs recent prices from the backend REST endpoint and groups them
// by ticker since the API just returns a flat list of rows.
export async function fetchStocks() {
  const res = await fetch(`${API_BASE}/api/stocks`);

  if (!res.ok) {
    throw new Error(`GET /api/stocks failed: ${res.status}`);
  }

  const { data } = await res.json();
  const byTicker = {};

  for (const row of data) {
    if (!byTicker[row.ticker]) byTicker[row.ticker] = [];
    byTicker[row.ticker].push(row);
  }

  // oldest first so the chart draws left to right
  for (const ticker in byTicker) {
    byTicker[ticker].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  return byTicker;
}
