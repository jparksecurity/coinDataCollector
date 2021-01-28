const WebSocket = require("ws");
const { nanoid } = require("nanoid");
const { Point } = require("@influxdata/influxdb-client");
const log = require("loglevel");
// const { writeApi } = require("./utils");

module.exports = () => {
  const ws = new WebSocket(process.env.UPBIT_WEBSOKET_URL);
  const trade = "trade";
  const orderbook = "orderbook";
  const exchange = "upbit";

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
    log.debug(point);
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
    log.debug(point);
  };

  ws.on("open", () => {
    ws.send(
      JSON.stringify([
        { ticket: nanoid() },
        {
          type: trade,
          codes: [process.env.UPBIT_SYMBOL],
          isOnlyRealtime: true,
        },
        {
          type: orderbook,
          codes: [`${process.env.UPBIT_SYMBOL}.1`],
          isOnlyRealtime: true,
        },
      ])
    );
  });

  ws.on("message", (rawMessage) => {
    const message = JSON.parse(rawMessage);
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

  process.on("SIGTERM", () => {
    ws.close(1000);
  });
};
