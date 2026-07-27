import { useEffect, useRef, useState } from 'react';
import { Socket } from 'phoenix';
import { WS_URL } from '../config';

/**
 * Owns the single Phoenix socket + "stocks:live" channel connection for the
 * whole dashboard. Returns:
 *   - status: "connecting" | "connected" | "disconnected"
 *   - snapshot: whatever the channel pushes on join (initial hydration)
 *   - lastUpdate: the most recent live price event, re-set on every push
 *   - requestHistorical(ticker): ask the backend for bounded price history
 *
 * NOTE: the exact push event names ("new_price" / a response event for
 * request_historical) are best-guesses based on the commit messages —
 * double check these against StockFetcherWeb.StockChannel and adjust the
 * two `channel.on(...)` calls below if the real names differ.
 */
export function useStockSocket() {
  const [status, setStatus] = useState('connecting');
  const [snapshot, setSnapshot] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [historical, setHistorical] = useState(null);
  const channelRef = useRef(null);

  useEffect(() => {
    const socket = new Socket(WS_URL);
    socket.connect();

    socket.onOpen(() => setStatus('connected'));
    socket.onError(() => setStatus('disconnected'));
    socket.onClose(() => setStatus('disconnected'));

    const channel = socket.channel('stocks:live', {});
    channelRef.current = channel;

    channel
      .join()
      .receive('ok', (payload) => {
        setStatus('connected');
        setSnapshot(payload);
      })
      .receive('error', (payload) => {
        console.error('Failed to join stocks:live', payload);
        setStatus('disconnected');
      });

    // Live price ticks, forwarded from the backend's :new_price PubSub
    // messages via push/3. Adjust the event name if it differs.
    channel.on('new_price', (payload) => {
      setLastUpdate(payload);
    });

    // Response to a request_historical push, keyed by ticker so multiple
    // in-flight requests don't clobber each other.
    channel.on('historical_data', (payload) => {
      setHistorical(payload);
    });

    return () => {
      channel.leave();
      socket.disconnect();
    };
  }, []);

  function requestHistorical(ticker, limit = 30) {
    channelRef.current?.push('request_historical', { ticker, limit });
  }

  return { status, snapshot, lastUpdate, historical, requestHistorical };
}
