/* eslint-disable global-require */

module.exports = (homebridge) => {
  const { MiHygrothermographAccessory } = require('./lib/accessory')(homebridge.hap);
  homebridge.registerAccessory(
    'homebridge-mi-hygrothermograph',
    'Hygrotermograph',
    MiHygrothermographAccessory,
  );
};
