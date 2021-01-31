const WebSocket = require("ws");
const { nanoid } = require("nanoid");
const { Point } = require("@influxdata/influxdb-client");
const log = require("loglevel");
const ReconnectingWebSocket = require("reconnecting-websocket");
const { currentTime, influxdb } = require("./utils");

module.exports = () => {
  const rws = new ReconnectingWebSocket(
    process.env.LIQUIDITY_UPBIT_WEBSOKET,
    [],
    { WebSocket }
  );
  const trade = "trade";
  const orderbook = "orderbook";
  const exchange = "upbit";
  const writeApi = influxdb.getWriteApi(
    process.env.ORG,
    process.env.LIQUIDITY_BUCKET,
    "ms"
  );

  const collectTrade = ({
    timestamp,
    trade_timestamp: ttms,
    trade_price: tp,
    trade_volume: tv,
    ask_bid: ab,
  }) => {
    const point = new Point(trade)
      .tag("exchange", exchange)
      .timestamp(timestamp)
      .stringField("trade_timestamp", ttms)
      .floatField("price", tp)
      .floatField("volume", tv)
      .booleanField("isAsk", ab === "ASK");
    writeApi.writePoint(point);
    log.debug(point.toLineProtocol(writeApi));
  };
  const collectOrderbook = ({
    timestamp,
    orderbook_units: [
      { ask_price: ap, bid_price: bp, ask_size: as, bid_size: bs },
    ],
  }) => {
    const point = new Point(orderbook)
      .tag("exchange", exchange)
      .timestamp(timestamp)
      .floatField("asks_0_price", ap)
      .floatField("bids_0_price", bp)
      .floatField("asks_0_quantity", as)
      .floatField("bids_0_quantity", bs);
    writeApi.writePoint(point);
    log.debug(point.toLineProtocol(writeApi));
  };

  rws.addEventListener("open", () => {
    rws.send(
      JSON.stringify([
        { ticket: nanoid() },
        {
          type: trade,
          codes: [process.env.LIQUIDITY_SYMBOL],
          isOnlyRealtime: true,
        },
        {
          type: orderbook,
          codes: [
            `${process.env.LIQUIDITY_SYMBOL}.${process.env.LIQUIDITY_ORDERBOOK_LIMIT}`,
          ],
          isOnlyRealtime: true,
        },
      ])
    );
  });

  rws.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    switch (message.type) {
      case trade:
        collectTrade(message);
        break;
      case orderbook:
        collectOrderbook(message);
        break;
      default:
    }
  });

  const logDisconnection = ({ type }) => {
    log.warn(currentTime, `${type} happened for upbit websocket`);
  };
  rws.addEventListener("error", logDisconnection);
  rws.addEventListener("close", logDisconnection);

  return () => {
    rws.removeEventListener("close", logDisconnection);
    rws.close();
  };
};
