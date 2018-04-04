/* eslint-disable global-require */

module.exports = (homebridge) => {
  const { HygrothermographAccessory } = require('./lib/accessory')(homebridge.hap);
  homebridge.registerAccessory(
    'homebridge-mi-hygrothermograph',
    'Hygrotermograph',
    HygrothermographAccessory
  );
};
