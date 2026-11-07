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

// --- Paper trading (step F) -> StockFetcherWeb.TradingController ---
// Amounts are integer cents; format them with formatCents in TradingPanel.

// GET /api/portfolio -> { cash_cents, positions: [...], orders: [...] }
export async function fetchPortfolio() {
  const res = await fetch(`${API_BASE}/api/portfolio`);

  if (!res.ok) {
    throw new Error(`GET /api/portfolio failed: ${res.status}`);
  }

  const { portfolio } = await res.json();
  return portfolio;
}

// POST /api/orders. No price is sent: the server fills at the newest saved price.
// Never throws. Resolves to { ok, body }:
//   ok: true  -> body = { order, portfolio, message }        (201)
//   ok: false -> body = { error, message }                    (422, 429, or network failure)
export async function placeOrder({ ticker, side, quantity }) {
  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, side, quantity }),
    });

    return { ok: res.ok, body: await res.json() };
  } catch (err) {
    return {
      ok: false,
      body: { error: 'network', message: `Couldn't reach the server (${err.message}).` },
    };
  }
}
