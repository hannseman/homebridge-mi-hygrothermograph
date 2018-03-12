const { MiHygrothermographAccessory } = require('./lib/accessory');

module.exports = (homebridge) => {
  global.Characteristic = homebridge.hap.Characteristic;
  global.Service = homebridge.hap.Service;
  homebridge.registerAccessory(
    'homebridge-mi-hygrothermograph',
    'Hygrotermograph',
    MiHygrothermographAccessory,
  );
};
