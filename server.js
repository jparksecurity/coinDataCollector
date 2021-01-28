require("dotenv").config();
const log = require("loglevel");
// const collectArbitrageData = require("./arbitrageData");
const collectLiquidityMiningData = require("./liquidityMiningData");
const { currentTime, writeApi } = require("./utils");

// log.enableAll();

// collectArbitrageData(writeApi);
collectLiquidityMiningData(writeApi);

process.on("SIGTERM", async () => {
  try {
    await writeApi.close();
    log.info(currentTime, "Process terminated");
  } catch (error) {
    log.warn(currentTime, error, "\\nFinished ERROR");
  }
});
