require("dotenv").config();
const log = require("loglevel");
const collectArbitrageData = require("./arbitrageData");
const collectLiquidityMiningData = require("./liquidityMiningData");
const { currentTime, writeApi } = require("./utils");

const arbitrageClose = collectArbitrageData();
const liquidityClose = collectLiquidityMiningData();

process.on("SIGTERM", async () => {
  try {
    arbitrageClose();
    liquidityClose();
    await writeApi.close();
    log.info(currentTime, "Process terminated");
  } catch (error) {
    log.warn(currentTime, error, "\\nFinished ERROR");
  }
});
