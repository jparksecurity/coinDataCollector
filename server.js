require("dotenv").config();
const log = require("loglevel");
const { InfluxDB } = require("@influxdata/influxdb-client");
// const collectArbitrageData = require("./arbitrageData");
const collectLiquidityMiningData = require("./liquidityMiningData");
const { currentTime } = require("./utils");

// log.enableAll();

const writeApi = new InfluxDB({
  url: process.env.URL,
  token: process.env.TOKEN,
}).getWriteApi(process.env.ORG, process.env.BUCKET, "ms");

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
