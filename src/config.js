// Change these (or set VITE_API_URL / VITE_WS_URL in a .env file) once the
// backend is running somewhere other than localhost:4000.
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/socket';

export const TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];

// How many points to keep per ticker for the Chart.js sparkline.
export const HISTORY_LIMIT = 30;
