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

    const ch = socket.channel('stocks:live', {});

    ch.join()
      .receive('ok', () => console.log('[App] joined stocks:live'))
      .receive('error', () => console.log('[App] could not join stocks:live'));

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

    channel.push('request_historical', { limit: HISTORY_LIMIT })
      .receive('ok', ({ data }) => {
        // TEMP: backend doesn't filter by ticker yet (stock_channel.ex request_historical) —
        // remove this .filter() once that's fixed server-side
        const filtered = data.filter((row) => row.ticker === selected);
        setData((prev) => ({ ...prev, [selected]: filtered }));
      })
      .receive('error', (err) => {
        console.log('[App] request_historical failed:', err);
      });
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