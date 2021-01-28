require("dotenv").config();
const log = require("loglevel");
const collectArbitrageData = require("./arbitrageData");
const collectLiquidityMiningData = require("./liquidityMiningData");
const { currentTime, writeApi } = require("./utils");

// log.enableAll();

const {
  bithumbOrderbookInterval,
  upbitOrderbookInterval,
  bithumbOhlcvInterval,
  upbitOhlcvInterval,
} = collectArbitrageData();
const upbitWebsocket = collectLiquidityMiningData();

process.on("SIGTERM", async () => {
  try {
    upbitWebsocket.close(1000);
    clearInterval(bithumbOrderbookInterval);
    clearInterval(upbitOrderbookInterval);
    clearInterval(bithumbOhlcvInterval);
    clearInterval(upbitOhlcvInterval);
    await writeApi.close();
    log.info(currentTime, "Process terminated");
  } catch (error) {
    log.warn(currentTime, error, "\\nFinished ERROR");
  }
});
