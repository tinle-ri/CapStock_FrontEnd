import StockCard from './StockCard';
import { TICKERS } from '../config';

/**
 * @param {Record<string, {price: number, timestamp: string}[]>} data
 *   ticker -> price history, oldest first
 */
export default function WatchlistPanel({ data }) {
  const hasAnyData = Object.values(data).some((h) => h.length > 0);

  if (!hasAnyData) {
    return (
      <div className="empty-state">
        Waiting for price data — check that the backend and Docker are running.
      </div>
    );
  }

  return (
    <div className="watchlist">
      {TICKERS.map((ticker) => (
        <StockCard key={ticker} ticker={ticker} history={data[ticker] ?? []} />
      ))}
    </div>
  );
}
