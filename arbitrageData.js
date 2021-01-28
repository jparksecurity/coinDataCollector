const ccxt = require("ccxt");
const { Point } = require("@influxdata/influxdb-client");

module.exports = (writeApi) => {
  const bithumb = new ccxt.bithumb();
  const upbit = new ccxt.upbit();

  const addOrdersToPoint = (orders, name, point) => {
    orders.forEach((order, index) =>
      point
        .floatField(`${name}_${index}_price`, order[0])
        .floatField(`${name}_${index}_quantity`, order[1])
    );
  };

  const collectOrderbook = async (exchange, name) => {
    try {
      const { bids, asks, timestamp } = await exchange.fetchOrderBook(
        process.env.SYMBOL,
        process.env.ORDERBOOK_LIMIT
      );
      const point = new Point("orderbook")
        .tag("exchange", name)
        .timestamp(timestamp);
      addOrdersToPoint(bids, "bids", point);
      addOrdersToPoint(asks, "asks", point);
      writeApi.writePoint(point);
    } catch (error) {
      console.log(error);
    }
  };

  let bithumbCandlesSince;
  let upbitCandlesSince;

  const addCandles = (candles, name) => {
    const points = candles.map((candle) =>
      new Point("candle")
        .tag("exchange", name)
        .timestamp(candle[0])
        .floatField("opening", candle[1])
        .floatField("high", candle[2])
        .floatField("low", candle[3])
        .floatField("closing", candle[4])
        .floatField("volume", candle[5])
    );
    writeApi.writePoints(points);
  };

  const collectBithumbOhlcv = async () => {
    const data = await bithumb.fetchOHLCV(
      process.env.SYMBOL,
      process.env.CANDLE_TIMEFRAME,
      bithumbCandlesSince,
      bithumbCandlesSince && process.env.CANDLE_LIMIT
    );
    const candles = bithumbCandlesSince
      ? data
      : data.slice(data.length - process.env.CANDLE_LIMIT);
    addCandles(candles, "bithumb");
    bithumbCandlesSince = candles[candles.length - 1][0] + 1;
  };

  const collectUpbitOhlcv = async () => {
    const candles = await upbit.fetchOHLCV(
      process.env.SYMBOL,
      process.env.CANDLE_TIMEFRAME,
      upbitCandlesSince,
      process.env.CANDLE_LIMIT
    );
    addCandles(candles, "upbit");
    upbitCandlesSince = candles[candles.length - 1][0] + 1;
  };

  const bithumbOrderbookInterval = setInterval(
    collectOrderbook,
    process.env.ORDERBOOK_TIMEFRAME_PERIOD * 1000,
    bithumb,
    "bithumb"
  );
  const upbitOrderbookInterval = setInterval(
    collectOrderbook,
    process.env.ORDERBOOK_TIMEFRAME_PERIOD * 1000,
    upbit,
    "upbit"
  );
  const bithumbOhlcvInterval = setInterval(
    collectBithumbOhlcv,
    process.env.CANDLE_LIMIT * 60 * 1000
  );
  const upbitOhlcvInterval = setInterval(
    collectUpbitOhlcv,
    process.env.CANDLE_LIMIT * 60 * 1000
  );

  process.on("SIGTERM", () => {
    clearInterval(bithumbOrderbookInterval);
    clearInterval(upbitOrderbookInterval);
    clearInterval(bithumbOhlcvInterval);
    clearInterval(upbitOhlcvInterval);
  });
};
