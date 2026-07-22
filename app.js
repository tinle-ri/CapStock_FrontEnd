/*
  Frontend prototype for Capstock, mirroring the class diagram:
  Stock (data) -> StockCard (render) -> WatchlistPanel (collection) -> Dashboard (page)
  APIService is mocked here (mockSocket) until the Phoenix Channel layer exists on the backend.
  Message shapes match the sync protocol we spec'd:
    sync_check -> sync_status -> bulk_sync (if stale) -> price_update (stream)
*/


