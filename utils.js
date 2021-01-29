const { InfluxDB } = require("@influxdata/influxdb-client");

module.exports = {
  currentTime: new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
  }),
  influxdb: new InfluxDB({
    url: process.env.URL,
    token: process.env.TOKEN,
  }),
};
