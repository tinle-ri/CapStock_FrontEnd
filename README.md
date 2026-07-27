# CapStock Frontend

React dashboard for the CapStock project (TCSS 360). Pulls stock data from the backend and shows it live using websockets.

## Running it

npm install
npm run dev

Goes to localhost:5173. Backend needs to be running in Docker for this to actually show data (change the urls in src/config.js if backend isn't on localhost:4000).

## How it works

- Loads stocks from `/api/stocks` when the page loads
- Connects to the `stocks:live` channel for live price updates
- Cards flash green/red when price changes
- Chart.js sparkline on each card showing recent price history

## TODO / things to check

- Not 100% sure the websocket event name is right (`new_price`) - need to check against what the channel actually sends
- Same with the join payload format, guessed the shape based on the REST response
- request_historical isn't hooked up to anything yet, just exists in the hook

## Files

- api.js - fetches from REST endpoint
- config.js - urls and settings
- hooks/useStockSocket.js - websocket connection stuff
- components/StockCard.jsx, WatchlistPanel.jsx
- App.jsx - ties it together
