# Capstock Dashboard (React + Chart.js)

Real-time stock ticker dashboard for Capstock (TCSS 360). Loads initial data
from the REST endpoint, then stays live over the Phoenix `stocks:live`
WebSocket channel.

## Setup

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173` by default. Requires the backend (Docker)
running and reachable — see `src/config.js` for the API/WS URLs, or set
`VITE_API_URL` / `VITE_WS_URL` in a `.env` file to point elsewhere.

## What's wired up

- **Initial load**: `GET /api/stocks` on mount, grouped by ticker.
- **Live updates**: joins `stocks:live`, listens for price ticks, appends
  each to a capped rolling history per ticker (`HISTORY_LIMIT` in
  `config.js`) that feeds both the current price and the Chart.js sparkline.
- **Flash animation**: `StockCard` compares each new price to the previous
  one and flashes green/red for ~900ms on change.
- **Connection status**: pill in the header reflects socket connect/
  disconnect state.

## Three things to verify against the real `StockChannel` before demoing

These were filled in based on commit messages, not the actual channel
source, so double-check:

1. **`src/hooks/useStockSocket.js`** — the live-update event name is
   assumed to be `"new_price"`. If the channel's `push/3` call uses a
   different event string, update the `channel.on('new_price', ...)` line.
2. **`src/App.jsx`** (join snapshot effect) — assumed the join payload is
   either a flat array of rows or `{ data: [...rows] }`, matching the REST
   shape. If `join/3` sends something else, adjust the parsing there.
3. **`request_historical`** — `useStockSocket` exposes
   `requestHistorical(ticker, limit)` and listens for a `"historical_data"`
   response, but nothing calls it yet (the REST load covers initial
   history). Wire it up if you want on-demand deeper history per ticker,
   and confirm the response event name matches.

## Structure

```
src/
  api.js              REST fetch + group-by-ticker
  config.js           API/WS URLs, ticker list, history length
  hooks/
    useStockSocket.js Phoenix socket + channel connection
  components/
    WatchlistPanel.jsx grid of StockCard
    StockCard.jsx       ticker, price, delta, sparkline, flash
  App.jsx              wires REST + socket into shared state
  main.jsx             entry point
```
