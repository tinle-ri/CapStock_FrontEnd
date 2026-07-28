# CapStock Frontend

React dashboard for the CapStock project (TCSS 360). Table of tracked tickers with live price updates, click a row to see its trend chart.

## Running it

```
npm install
npm run dev
```

Goes to localhost:5173. Backend needs to be running in Docker for this to actually show data (change the urls in src/config.js if backend isn't on localhost:4000).

## How it works

- Loads stocks from `/api/stocks` on page load, shown as a table (ticker, price, change, last updated) per SRS REQ-FRONT-01
- Connects to the `stocks:broadcasts` channel for live price pushes (`new_price` events)
- Clicking a row selects that ticker and shows a trend chart below the table (REQ-FRONT-03), and asks the backend for deeper history via `request_historical`
- Price cells flash green/red based on last tick direction

## TODO / things to check

- Channel topic was changed from `stocks:live` to `stocks:broadcasts` based on SRS Appendix C - still needs confirming against the actual `stock_channel.ex`
- `historical_data` response shape is assumed to be `{ ticker, prices }` - not confirmed against backend

## Files

- api.js - fetches from REST endpoint
- config.js - urls and settings
- components/WatchlistTable.jsx - the ticker table
- components/TrendChart.jsx - chart for the selected ticker
- App.jsx - socket connection, state, ties it together
