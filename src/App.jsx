import { useEffect, useState } from 'react';
import { Socket } from 'phoenix';
import WatchlistTable from './components/WatchlistTable';
import TrendChart from './components/TrendChart';
import { fetchStocks } from './api';
import { TICKERS, HISTORY_LIMIT, WS_URL } from './config';

function emptyState() {
  const state = {};
  TICKERS.forEach((t) => (state[t] = []));
  return state;
}

export default function App() {
  const [data, setData] = useState(emptyState);
  const [status, setStatus] = useState('connecting');
  const [loadError, setLoadError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [channel, setChannel] = useState(null);

  // initial load, doesn't need the socket to be connected first
  useEffect(() => {
    fetchStocks()
      .then((byTicker) => {
        setData((prev) => ({ ...prev, ...byTicker }));
      })
      .catch((err) => {
        console.log('[App] failed to load initial stocks:', err.message);
        setLoadError(err.message);
      });
  }, []);

  // socket connection for live price updates
  useEffect(() => {
    const socket = new Socket(WS_URL);
    socket.connect();

    socket.onOpen(() => setStatus('connected'));
    socket.onError(() => setStatus('disconnected'));
    socket.onClose(() => setStatus('disconnected'));

    // NOTE: SRS Appendix C says the real topic is "stocks:broadcasts",
    // not "stocks:live" - double check this against stock_channel.ex
    const ch = socket.channel('stocks:broadcasts', {});

    ch.join()
      .receive('ok', () => console.log('[App] joined stocks:broadcasts'))
      .receive('error', () => console.log('[App] could not join stocks:broadcasts'));

    ch.on('new_price', (payload) => {
      const { ticker, price, timestamp } = payload;

      setData((prev) => {
        const history = prev[ticker] || [];
        const updated = [...history, { price, timestamp }];

        // keep the array from growing forever
        if (updated.length > HISTORY_LIMIT) {
          updated.shift();
        }

        return { ...prev, [ticker]: updated };
      });
    });

    // response to a request_historical push - replaces that ticker's
    // history with whatever deeper range the backend sends back
    ch.on('historical_data', (payload) => {
      const { ticker, prices } = payload;
      if (!ticker || !prices) return;

      setData((prev) => ({ ...prev, [ticker]: prices }));
    });

    setChannel(ch);

    return () => {
      ch.leave();
      socket.disconnect();
    };
  }, []);

  // when the user selects a ticker, ask the backend for deeper history
  // for that one (REQ-FRONT-03 - trend chart for the selected ticker)
  useEffect(() => {
    if (!selected || !channel) return;
    channel.push('request_historical', { ticker: selected, limit: HISTORY_LIMIT });
  }, [selected, channel]);

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
          show up once the socket connects.
        </div>
      )}

      <WatchlistTable data={data} selected={selected} onSelect={setSelected} />
      <TrendChart ticker={selected} history={selected ? data[selected] : null} />
    </div>
  );
}
