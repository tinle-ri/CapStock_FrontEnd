/*
  Frontend prototype for Capstock, mirroring the class diagram:
  Stock (data) -> StockCard (render) -> WatchlistPanel (collection) -> Dashboard (page)
  APIService is mocked here (mockSocket) until the Phoenix Channel layer exists on the backend.
  Message shapes match the sync protocol we spec'd:
    sync_check -> sync_status -> bulk_sync (if stale) -> price_update (stream)
*/

class Stock {
  constructor(name, price) {
    this.name = name;
    this.price = price;
    this.prevPrice = price;
    this.history = [price];
    this.insertedAt = new Date().toISOString();
  }
  applyUpdate({ price, inserted_at }) {
    this.prevPrice = this.price;
    this.price = price;
    this.insertedAt = inserted_at;
    this.history.push(price);
    if (this.history.length > 30) this.history.shift();
  }
  get delta() {
    return this.price - this.history[0];
  }
  get deltaPercent() {
    return (this.delta / this.history[0]) * 100;
  }
  get isGaining() {
    return this.price >= this.prevPrice;
  }
}

class StockCard {
  constructor(stock, onSelect) {
    this.stock = stock;
    this.onSelect = onSelect;
    this.el = document.createElement("div");
    this.el.className = "stock-card";
    this.el.addEventListener("click", () => this.onSelect(this.stock.name));
    this.render();
  }
  sparkPath() {
    const h = this.stock.history;
    if (h.length < 2) return "";
    const min = Math.min(...h), max = Math.max(...h);
    const range = max - min || 1;
    const w = 200, height = 34;
    return h
      .map((p, i) => {
        const x = (i / (h.length - 1)) * w;
        const y = height - ((p - min) / range) * height;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }
  render() {
    const s = this.stock;
    const up = s.isGaining;
    this.el.innerHTML = `
      <div class="card-top">
        <div class="ticker">${s.name}</div>
        <div class="delta ${up ? "up" : "down"}">${up ? "▲" : "▼"} ${Math.abs(s.deltaPercent).toFixed(2)}%</div>
      </div>
      <div class="price">$${s.price.toFixed(2)}</div>
      <svg class="spark" viewBox="0 0 200 34" preserveAspectRatio="none">
        <path d="${this.sparkPath()}" stroke="${up ? "var(--up)" : "var(--down)"}" />
      </svg>
      <div class="updated">updated ${new Date(s.insertedAt).toLocaleTimeString()}</div>
    `;
  }
  update() {
    this.render();
    this.el.classList.remove("flash", "flash-down");
    void this.el.offsetWidth; // restart animation
    this.el.classList.add(this.stock.isGaining ? "flash" : "flash-down");
  }
  setSelected(isSelected) {
    this.el.classList.toggle("selected", isSelected);
  }
}

class WatchlistPanel {
  constructor(container, onSelect) {
    this.container = container;
    this.onSelect = onSelect;
    this.cards = new Map();
  }
  addStock(stock) {
    const card = new StockCard(stock, this.onSelect);
    this.cards.set(stock.name, card);
    this.container.appendChild(card.el);
  }
  updateStock(name) {
    this.cards.get(name)?.update();
  }
  setSelected(name) {
    this.cards.forEach((card, key) => card.setSelected(key === name));
  }
}

class DetailPanel {
  constructor(el) {
    this.el = el;
  }
  render(stock) {
    if (!stock) {
      this.el.innerHTML = `<div class="detail-empty">Select a ticker to see its trend.</div>`;
      return;
    }
    const h = stock.history;
    const min = Math.min(...h), max = Math.max(...h);
    const range = max - min || 1;
    const w = 600, height = 140;
    const points = h.map((p, i) => {
      const x = (i / (h.length - 1 || 1)) * w;
      const y = height - ((p - min) / range) * (height - 10) - 5;
      return [x, y];
    });
    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const fill = `${line} L${w},${height} L0,${height} Z`;
    this.el.innerHTML = `
      <div class="detail-header">
        <div class="ticker">${stock.name}</div>
        <div class="price">$${stock.price.toFixed(2)}</div>
      </div>
      <svg class="detail-chart" viewBox="0 0 ${w} ${height}" preserveAspectRatio="none">
        <path class="fill" d="${fill}" />
        <path d="${line}" />
      </svg>
    `;
  }
}

class App {
  constructor() {
    this.watchlistEl = document.getElementById("watchlist");
    this.detailEl = document.getElementById("detail");
    this.syncLogEl = document.getElementById("syncLog");
    this.statusPill = document.getElementById("statusPill");
    this.statusText = document.getElementById("statusText");

    this.stocks = new Map();
    this.selected = null;
    this.watchlist = new WatchlistPanel(this.watchlistEl, (name) => this.selectTicker(name));
    this.detail = new DetailPanel(this.detailEl);
  }

  log(msg) {
    this.syncLogEl.innerHTML = msg;
  }

  selectTicker(name) {
    this.selected = name;
    this.watchlist.setSelected(name);
    this.detail.render(this.stocks.get(name));
  }

  init() {
    this.log("→ opening socket, joining <b>stocks:lobby</b>…");
    mockSocket.connect({
      onSyncCheck: (tickers) => {
        this.log(`← <b>sync_check</b> received for ${tickers.join(", ")} — no local data, requesting bulk sync`);
        return { type: "sync_status", have_data: false, last_seen: {} };
      },
      onBulkSync: (rows) => {
        rows.forEach((row) => {
          if (!this.stocks.has(row.name)) {
            const stock = new Stock(row.name, row.price);
            this.stocks.set(row.name, stock);
            this.watchlist.addStock(stock);
          }
        });
        this.statusPill.classList.add("live");
        this.statusText.textContent = "live";
        this.log(`← <b>bulk_sync</b> hydrated ${rows.length} tickers — streaming live updates`);
      },
      onPriceUpdate: (msg) => {
        const stock = this.stocks.get(msg.name);
        if (!stock) return;
        stock.applyUpdate(msg);
        this.watchlist.updateStock(msg.name);
        if (this.selected === msg.name) this.detail.render(stock);
      },
    });
  }
}

/* ---- Mock backend, standing in for the Phoenix Channel that doesn't exist yet ---- */
const mockSocket = {
  tickers: ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"],
  basePrices: { AAPL: 317.31, MSFT: 390.99, GOOGL: 352.51, AMZN: 247.31, TSLA: 394.76 },
  connect(handlers) {
    setTimeout(() => {
      const status = handlers.onSyncCheck(this.tickers);
      if (!status.have_data) {
        setTimeout(() => {
          const rows = this.tickers.map((name) => ({
            inserted_at: new Date().toISOString(),
            name,
            price: this.basePrices[name],
          }));
          handlers.onBulkSync(rows);
          this.startStreaming(handlers);
        }, 500);
      }
    }, 600);
  },
  startStreaming(handlers) {
    setInterval(() => {
      const name = this.tickers[Math.floor(Math.random() * this.tickers.length)];
      const jitter = (Math.random() - 0.5) * 2.2;
      this.basePrices[name] = Math.max(1, this.basePrices[name] + jitter);
      handlers.onPriceUpdate({
        type: "price_update",
        inserted_at: new Date().toISOString(),
        name,
        price: this.basePrices[name],
      });
    }, 2200);
  },
};

new App().init();
