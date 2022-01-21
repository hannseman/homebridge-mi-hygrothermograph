module.exports = (homebridge) => {
  const {
    HygrothermographAccessory,
    MiFloraAccessory,
  } = require("./lib/accessory")(homebridge);
  homebridge.registerAccessory(
    "homebridge-mi-hygrothermograph",
    "Hygrotermograph",
    HygrothermographAccessory
  );
  homebridge.registerAccessory(
    "homebridge-mi-hygrothermograph",
    "MiFlora",
    MiFloraAccessory
  );
};
