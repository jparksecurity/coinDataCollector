const ccxt = require("ccxt");
const { Point } = require("@influxdata/influxdb-client");
const log = require("loglevel");
const { currentTime, influxdb } = require("./utils");

module.exports = () => {
  const ccxtBithumb = new ccxt.bithumb();
  const ccxtUpbit = new ccxt.upbit();
  const bithumb = "bithumb";
  const upbit = "upbit";
  const writeApi = influxdb.getWriteApi(
    process.env.ORG,
    process.env.ARBITRAGE_BUCKET,
    "ms"
  );

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
        process.env.ARBITRAGE_SYMBOL,
        process.env.ARBITRAGE_ORDERBOOK_LIMIT
      );
      const point = new Point("orderbook")
        .tag("exchange", name)
        .timestamp(timestamp);
      addOrdersToPoint(bids, "bids", point);
      addOrdersToPoint(asks, "asks", point);
      writeApi.writePoint(point);
      log.debug(point.toLineProtocol(writeApi));
    } catch (error) {
      log.warn(currentTime, error);
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
    points.forEach((point) => {
      log.debug(point.toLineProtocol(writeApi));
    });
  };

  const collectBithumbOhlcv = async () => {
    const data = await ccxtBithumb.fetchOHLCV(
      process.env.ARBITRAGE_SYMBOL,
      process.env.ARBITRAGE_CANDLE_TIMEFRAME,
      bithumbCandlesSince,
      bithumbCandlesSince && process.env.ARBITRAGE_CANDLE_LIMIT
    );
    const candles = bithumbCandlesSince
      ? data
      : data.slice(data.length - process.env.ARBITRAGE_CANDLE_LIMIT);
    addCandles(candles, bithumb);
    bithumbCandlesSince = candles[candles.length - 1][0] + 1;
  };

  const collectUpbitOhlcv = async () => {
    const candles = await ccxtUpbit.fetchOHLCV(
      process.env.ARBITRAGE_SYMBOL,
      process.env.ARBITRAGE_CANDLE_TIMEFRAME,
      upbitCandlesSince,
      process.env.ARBITRAGE_CANDLE_LIMIT
    );
    addCandles(candles, upbit);
    upbitCandlesSince = candles[candles.length - 1][0] + 1;
  };

  const bithumbOrderbookInterval = setInterval(
    collectOrderbook,
    process.env.ARBITRAGE_ORDERBOOK_TIMEFRAME_PERIOD * 1000,
    ccxtBithumb,
    bithumb
  );
  const upbitOrderbookInterval = setInterval(
    collectOrderbook,
    process.env.ARBITRAGE_ORDERBOOK_TIMEFRAME_PERIOD * 1000,
    ccxtUpbit,
    upbit
  );
  const bithumbOhlcvInterval = setInterval(
    collectBithumbOhlcv,
    process.env.ARBITRAGE_CANDLE_LIMIT * 60 * 1000
  );
  const upbitOhlcvInterval = setInterval(
    collectUpbitOhlcv,
    process.env.ARBITRAGE_CANDLE_LIMIT * 60 * 1000
  );

  return () => {
    clearInterval(bithumbOrderbookInterval);
    clearInterval(upbitOrderbookInterval);
    clearInterval(bithumbOhlcvInterval);
    clearInterval(upbitOhlcvInterval);
  };
};
