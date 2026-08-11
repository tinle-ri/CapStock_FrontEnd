// table of tracked tickers - price, change, last updated
// clicking a row selects that ticker for the trend chart (REQ-FRONT-03)
export default function WatchlistTable({ data, selected, onSelect }) {
  const tickers = Object.keys(data);
  const hasData = tickers.some((t) => data[t].length > 0);

  if (!hasData) {
    return (
      <div className="empty-state">
        No price data yet — check the connection status above, or markets
        may be closed.
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
                <td>{ticker}</td>
                <td colSpan="3" style={{ color: 'var(--text-muted)' }}>--</td>
              </tr>
            );
          }

          const previous = history.length > 1 ? history[history.length - 2] : null;
          const delta = previous ? latest.price - previous.price : 0;

          let direction = null;
          if (delta > 0) direction = 'up';
          if (delta < 0) direction = 'down';

          return (
            <tr
              key={ticker}
              className={ticker === selected ? 'selected-row' : ''}
              onClick={() => onSelect(ticker)}
            >
              <td className="ticker-cell">{ticker}</td>
              <td className="price-cell" data-flash={direction}>
                ${latest.price.toFixed(2)}
              </td>
              <td>
                {direction && (
                  <span className="stock-delta" data-direction={direction}>
                    {direction === 'up' ? '▲' : '▼'} {Math.abs(delta).toFixed(2)}
                  </span>
                )}
              </td>
              <td className="timestamp-cell">
                {new Date(latest.timestamp).toLocaleTimeString()}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
