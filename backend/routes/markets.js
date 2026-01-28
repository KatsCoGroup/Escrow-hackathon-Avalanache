const express = require("express");
const router = express.Router();

// Basic fetch helper with a UA header to avoid provider blocks
const fetchJson = async (url) => {
  const res = await fetch(url, {
    headers: { "User-Agent": "aura-link-markets/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// Build a flat series when upstream providers fail so the UI still renders
const buildFallbackSeries = (price = 0) => {
  const points = [];
  const now = Date.now();
  for (let i = 23; i >= 0; i -= 1) {
    const d = new Date(now - i * 60 * 60 * 1000);
    const label = d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
    points.push({ time: label, value: price });
  }
  return points;
};

router.get("/prices", async (_req, res) => {
  try {
    try {
      const data = await fetchJson(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,avalanche-2&vs_currencies=usd&include_24hr_change=true"
      );
      return res.json({
        success: true,
        rows: [
          { symbol: "ETH", price: data.ethereum.usd, change24h: data.ethereum.usd_24h_change, icon: "◆" },
          { symbol: "AVAX", price: data["avalanche-2"].usd, change24h: data["avalanche-2"].usd_24h_change, icon: "△" },
          { symbol: "BTC", price: data.bitcoin.usd, change24h: data.bitcoin.usd_24h_change, icon: "₿" },
        ],
        source: "coingecko",
      });
    } catch (err) {
      const eth = await fetchJson("https://api.coincap.io/v2/assets/ethereum");
      const btc = await fetchJson("https://api.coincap.io/v2/assets/bitcoin");
      const avax = await fetchJson("https://api.coincap.io/v2/assets/avalanche-2");
      return res.json({
        success: true,
        rows: [
          { symbol: "ETH", price: Number(eth.data.priceUsd), change24h: Number(eth.data.changePercent24Hr), icon: "◆" },
          { symbol: "AVAX", price: Number(avax.data.priceUsd), change24h: Number(avax.data.changePercent24Hr), icon: "△" },
          { symbol: "BTC", price: Number(btc.data.priceUsd), change24h: Number(btc.data.changePercent24Hr), icon: "₿" },
        ],
        source: "coincap",
      });
    }
  } catch (error) {
    console.error("markets/prices error", error.message);
    res.status(500).json({ success: false, message: "Failed to load prices", error: error.message });
  }
});

router.get("/eth-chart", async (_req, res) => {
  try {
    try {
      // Binance public klines for 24h hourly closes (no API key required)
      const klines = await fetchJson(
        "https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=1h&limit=24"
      );
      const series = (klines || []).map((k) => {
        const openTime = k[0];
        const closePrice = Number(k[4]);
        const d = new Date(openTime);
        const label = d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
        return { time: label, value: closePrice };
      });
      return res.json({ success: true, series, source: "binance" });
    } catch (err) {
      console.error("markets/eth-chart primary error", err.message);
      // Fallback to a flat line using current price if chart provider unavailable
      const priceData = await fetchJson("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
      const fallbackSeries = buildFallbackSeries(priceData?.ethereum?.usd ?? 0);
      return res.json({ success: true, series: fallbackSeries, source: "fallback-flat" });
    }
  } catch (error) {
    console.error("markets/eth-chart error", error.message);
    const fallbackSeries = buildFallbackSeries();
    return res.json({ success: true, series: fallbackSeries, source: "fallback-flat" });
  }
});

module.exports = router;
