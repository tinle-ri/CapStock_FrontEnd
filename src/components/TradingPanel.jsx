// Paper-trading panel (step F). Must match the LiveView panel field for field
// (StockFetcherWeb.PricesLive): ticker dropdown, quantity, Buy/Sell, confirmation or
// error message, cash, positions with live P/L, order history.
// Orders go to POST /api/orders; the server prices them, so no price is sent.

import { useEffect, useState } from "react";
import { fetchPortfolio, placeOrder } from "../api";

// Integer cents -> "$1,234.56" / "-$5.00" (same output as Trading.format_cents/1).
function formatCents(cents) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString("en-US");
  const pennies = String(abs % 100).padStart(2, "0");
  return `${sign}$${dollars}.${pennies}`;
}

function formatSignedCents(cents) {
  return cents > 0 ? `+${formatCents(cents)}` : formatCents(cents);
}

// Latest price for a ticker in cents, from the live data App already keeps. Display only.
function currentCents(data, ticker) {
  const history = data[ticker] || [];
  const latest = history[history.length - 1];
  return latest ? Math.round(latest.price * 100) : null;
}

// "2026-11-06T14:03:21Z" -> the viewer's local time, e.g. "06:03:21 AM" in Seattle.
// The same toLocaleTimeString call as the LiveView panel's LocalTime hook, so both match.
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function TradingPanel({ data }) {
  const tickers = Object.keys(data)
    .filter((t) => data[t].length > 0)
    .sort();

  const [portfolio, setPortfolio] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [message, setMessage] = useState(null); // { kind: "ok" | "error", text }
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("1");

  useEffect(() => {
    fetchPortfolio()
      .then(setPortfolio)
      .catch((err) => setLoadError(err.message));
  }, []);

  // A controlled <select> needs a value from the list; pick the first once prices arrive.
  const selectedTicker = tickers.includes(ticker) ? ticker : tickers[0] || "";

  // Which button was clicked arrives as the form's submitter, like "side" in LiveView.
  function handleSubmit(event) {
    event.preventDefault();
    const side = event.nativeEvent.submitter.value; // "buy" | "sell"
    submitOrder(side);
  }

  // Same two branches as handle_event's case in PricesLive.
  async function submitOrder(side) {
    const { ok, body } = await placeOrder({ ticker: selectedTicker, side, quantity });

    if (ok) {
      setPortfolio(body.portfolio);
      setMessage({ kind: "ok", text: body.message });
    } else {
      // Only the message changes; the portfolio on screen stays as it was.
      setMessage({ kind: "error", text: body.message });
    }
  }

  if (loadError) {
    return <div className="error-banner">Couldn't load the portfolio ({loadError}).</div>;
  }

  if (!portfolio) {
    return <section className="trade-panel">Loading portfolio…</section>;
  }

  return (
    <section className="trade-panel" id="trade">
      <h2>Trade</h2>
      <p className="trade-hint">Paper trading: market orders fill at the price shown above.</p>

      <form id="order-form" className="order-form" onSubmit={handleSubmit}>
        <label>
          Ticker
          <select value={selectedTicker} onChange={(e) => setTicker(e.target.value)}>
            {tickers.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantity
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>
        <button type="submit" value="buy" className="buy-btn" disabled={tickers.length === 0}>
          Buy
        </button>
        <button type="submit" value="sell" className="sell-btn" disabled={tickers.length === 0}>
          Sell
        </button>
      </form>

      {message && (
        <p id="order-message" className="order-message" data-kind={message.kind}>
          {message.text}
        </p>
      )}

      <p id="cash" className="cash">
        Cash: <strong>{formatCents(portfolio.cash_cents)}</strong>
      </p>

      <h3>Positions</h3>
      {portfolio.positions.length === 0 ? (
        <p className="trade-hint">No positions.</p>
      ) : (
        <table id="positions" className="watchlist-table positions-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th className="num">Qty</th>
              <th className="num">Avg cost</th>
              <th className="num">Price</th>
              <th className="num">P/L</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.positions.map((pos) => {
              const cents = currentCents(data, pos.ticker);
              const pnl = cents === null ? null : (cents - pos.avg_cost_cents) * pos.quantity;

              return (
                <tr key={pos.ticker} id={`position-${pos.ticker}`}>
                  <td className="ticker-cell">{pos.ticker}</td>
                  <td className="num">{pos.quantity}</td>
                  <td className="num">{formatCents(pos.avg_cost_cents)}</td>
                  <td className="num">{cents === null ? "–" : formatCents(cents)}</td>
                  <td className="num">{pnl === null ? "–" : formatSignedCents(pnl)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h3>Order history</h3>
      {portfolio.orders.length === 0 ? (
        <p className="trade-hint">No orders yet.</p>
      ) : (
        <ul id="orders" className="order-list">
          {portfolio.orders.map((order) => (
            <li key={order.id} id={`order-${order.id}`}>
              {formatTime(order.inserted_at)} {order.side.toUpperCase()} {order.quantity}{" "}
              {order.ticker} @ {formatCents(order.price_cents)} ({formatCents(order.total_cents)})
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
