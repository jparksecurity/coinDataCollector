require("dotenv").config();
const { InfluxDB } = require("@influxdata/influxdb-client");
// const collectArbitrageData = require("./arbitrageData");
const collectLiquidityMiningData = require("./liquidityMiningData");

const writeApi = new InfluxDB({
  url: process.env.URL,
  token: process.env.TOKEN,
}).getWriteApi(process.env.ORG, process.env.BUCKET, "ms");

// collectArbitrageData(writeApi);
collectLiquidityMiningData(writeApi);

process.on("SIGTERM", () => {
  writeApi
    .close()
    .then(() => {
      console.log("Process terminated");
    })
    .catch((error) => {
      console.log(error);
      console.log("\\nFinished ERROR");
    });
});
