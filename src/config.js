// change these if the backend isn't running on localhost:4000
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/socket';

export const TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];

// how many points to keep per ticker for the chart
export const HISTORY_LIMIT = 30;
