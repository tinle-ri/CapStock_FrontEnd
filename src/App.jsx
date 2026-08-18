import { useEffect, useState } from "react";
import { Socket } from "phoenix";
import WatchlistTable from "./components/WatchlistTable";
import TrendChart from "./components/TrendChart";
import { fetchStocks } from "./api";
import { TICKERS, HISTORY_LIMIT, WS_URL } from "./config";
import { isMarketOpen, hoursUntilNextOpen } from "./marketHours";

function emptyState() {
  const state = {};
  TICKERS.forEach((t) => (state[t] = []));
  return state;
}

function hasAnyData(data) {
  return Object.values(data).some((history) => history.length > 0);
}

export default function App() {
  const [data, setData] = useState(emptyState);
  const [status, setStatus] = useState("connecting");
  const [loadError, setLoadError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [channel, setChannel] = useState(null);
  const [marketOpen, setMarketOpen] = useState(isMarketOpen());

  // re-check every minute so the banner updates itself around the
  // open/close boundary without needing a page refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketOpen(isMarketOpen());
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  // Initial REST hydration call -> maps to StockController.index/2
  useEffect(() => {
    fetchStocks()
      .then((byTicker) => {
        setData((prev) => ({ ...prev, ...byTicker }));
      })
      .catch((err) => {
        console.log("[App] failed to load initial stocks:", err.message);
        setLoadError(err.message);
      });
  }, []);

  // Phoenix WebSocket connection for real-time price ticks
  useEffect(() => {
    const socket = new Socket(WS_URL);
    socket.connect();

    socket.onOpen(() => setStatus("connected"));
    socket.onError(() => setStatus("disconnected"));
    socket.onClose(() => setStatus("disconnected"));

    // Connects to StockFetcherWeb.StockChannel via topic "stocks:live"
    const ch = socket.channel("stocks:live", {});

    ch.join()
      .receive("ok", () => console.log("[App] joined stocks:live"))
      .receive("error", () => console.log("[App] could not join stocks:live"));

    // Listens for PubSub broadcasts emitted by StockFetcher.Mock.Streamer
    ch.on("new_price", (payload) => {
      const { ticker, price, timestamp } = payload;

      setData((prev) => {
        const history = prev[ticker] || [];
        const updated = [...history, { price, timestamp }];

        // Bound array size to HISTORY_LIMIT
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

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Capstock</h1>
          <div className="subtitle">
            Live watchlist — AAPL, MSFT, GOOGL, AMZN, TSLA
          </div>
        </div>
        <span className="status-pill" data-status={status}>
          <span className="status-dot" />
          {status}
        </span>
      </header>

      {loadError && (
        <div className="error-banner">
          Couldn't load initial data ({loadError}). Live updates will still show
          up once the socket connects.
        </div>
      )}

      {!marketOpen && !hasAnyData(data) && (
        <div className="market-closed-banner">
          Markets are closed right now — reopens in about {hoursUntilNextOpen()}{" "}
          hours. Prices won't update until the worker resumes polling.
        </div>
      )}

      <WatchlistTable
        data={data}
        selected={selected}
        onSelect={setSelected}
        marketOpen={marketOpen}
      />
      <TrendChart
        ticker={selected}
        history={selected ? data[selected] : null}
      />
    </div>
  );
}
