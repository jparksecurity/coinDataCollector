const { InfluxDB } = require("@influxdata/influxdb-client");

module.exports = {
  currentTime: new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
  }),
  writeApi: new InfluxDB({
    url: process.env.URL,
    token: process.env.TOKEN,
  }).getWriteApi(process.env.ORG, process.env.BUCKET, "ms"),
};
