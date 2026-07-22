# Capstock — Frontend

Single-page dashboard for **Capstock**, a real-time stock ticker viewer built for TCSS 360.
Displays live price data for a fixed watchlist (AAPL, MSFT, GOOGL, AMZN, TSLA) with per-ticker
sparklines and an expandable trend chart.

This repo is intentionally decoupled from the backend
([`stock_fetcher-CapStock_BACKEND`](https://github.com/dxu13UW/stock_fetcher-CapStock_BACKEND)).
The frontend never talks to Finnhub or the database directly — its only contract with the
backend is a single WebSocket connection.

## Status

## Running locally

No build step. Just serve the directory:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open the printed URL. Right now it runs entirely on fake data — see **Mock data** below.

## Project structure

```
.
├── index.html      # page shell / markup
├── styles.css       # all styling — dark, monospace-forward, terminal-inspired
└── app.js          # Stock / StockCard / WatchlistPanel / App classes + mock socket
```

The JS classes mirror the project's UML class diagram:

| Class            | Responsibility                                      |
|------------------|------------------------------------------------------|
| `Stock`          | Data model for one ticker (price, history, deltas)    |
| `StockCard`      | Renders one ticker tile + sparkline                   |
| `WatchlistPanel` | Owns the grid of `StockCard`s                         |
| `DetailPanel`    | Renders the expanded trend chart for a selected ticker|
| `App`            | Page wiring — owns the socket connection and state    |

## WebSocket protocol

The frontend and backend agree on this message contract (see `app.js` / `mockSocket` for the
mocked version of the backend side):

1. **Backend → client**, on connect:
   ```json
   { "type": "sync_check", "tickers": ["AAPL", "..."], "freshness_threshold_seconds": 60 }
   ```
2. **Client → backend**, reporting what it already has:
   ```json
   { "type": "sync_status", "have_data": false, "last_seen": { "AAPL": null, "...": "..." } }
   ```
3. **Backend → client**, if stale/missing, one bulk catch-up payload:
   ```json
   { "type": "bulk_sync", "data": [ { "inserted_at": "...", "name": "AAPL", "price": 317.31 } ] }
   ```
4. **Backend → client**, live stream entries after that:
   ```json
   { "type": "price_update", "inserted_at": "...", "name": "AAPL", "price": 317.31 }
   ```

Payloads intentionally carry **only** frontend-relevant fields (`name`, `price`, `inserted_at`) —
no upstream API details, retry/backoff state, or database internals ever cross the socket.

## Swapping in the real backend

Once the backend exposes a real Phoenix Channel, replace the `mockSocket` object in `app.js`
with a real client that calls the same three handlers (`onSyncCheck`, `onBulkSync`,
`onPriceUpdate`) — nothing else in `App`, `WatchlistPanel`, `StockCard`, or `DetailPanel` needs
to change.

## Related requirements (SRS §3.3)

- REQ-FRONT-01 — Live ticker view with price, change, last-updated
- REQ-FRONT-02 — Automatic updates on broadcast, no manual refresh
- REQ-FRONT-03 — Trend chart for an individually selected ticker
- REQ-FRONT-04 — No authentication required (v1.0)
