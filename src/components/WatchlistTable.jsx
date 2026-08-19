// table of tracked tickers - price, change, last updated
// clicking a row selects that ticker for the trend chart (REQ-FRONT-03)

import { hoursUntilNextOpen } from "../marketHours";

export default function WatchlistTable({
  data,
  selected,
  onSelect,
  marketOpen,
}) {
  const tickers = Object.keys(data);
  const hasData = tickers.some((t) => data[t].length > 0);
  const hoursLeft = hoursUntilNextOpen();

  if (!hasData) {
    return (
      <div className="empty-state">
        No price data yet — check the connection status above, or markets may be
        closed.
      </div>
    );
  }

  return (
    <table className="watchlist-table">
      <thead>
        <tr>
          <th>Ticker</th>
          <th>Price</th>
          <th>Change</th>
          <th>Last Updated</th>
        </tr>
      </thead>
      <tbody>
        {tickers.map((ticker) => {
          const history = data[ticker];
          const latest = history[history.length - 1];

          if (!latest) {
            return (
              <tr key={ticker}>
                <td className="ticker-cell">{ticker}</td>
                <td colSpan="3" style={{ color: "var(--text-muted)" }}>
                  --
                </td>
              </tr>
            );
          }
          const openPrice = history[0].price;
          const delta = latest.price - openPrice;
          const percentDelta = openPrice > 0 ? (delta / openPrice) * 100 : 0;

          let direction = null;
          if (delta > 0.001) direction = "up";
          if (delta < -0.001) direction = "down";

          return (
            <tr
              key={ticker}
              className={ticker === selected ? "selected-row" : ""}
              onClick={() => onSelect(ticker)}
            >
              <td className="ticker-cell">{ticker}</td>
              <td className="price-cell" data-flash={direction}>
                ${latest.price.toFixed(2)}
              </td>
              <td>
                {!marketOpen ? (
                  <span className="stock-delta" data-direction="closed">
                    Market closed
                  </span>
                ) : direction ? (
                  <span className="stock-delta" data-direction={direction}>
                    {direction === "up" ? "▲" : "▼"} $
                    {Math.abs(delta).toFixed(2)} (
                    {Math.abs(percentDelta).toFixed(2)}%)
                  </span>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>
                    $0.00 (0.00%)
                  </span>
                )}
              </td>
              <td className="timestamp-cell">
                {!marketOpen
                  ? `Opens in ~${hoursLeft}h`
                  : new Date(latest.timestamp).toLocaleTimeString()}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}