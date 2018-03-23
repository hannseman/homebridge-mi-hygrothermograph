const { Scanner } = require('./scanner');

let Service;
let Characteristic;

class MiHygrothermographAccessory {
  constructor(log, config) {
    this.log = log;
    this.config = config;

    this.currentTemperature = 0.0;
    this.currentHumidity = 0.0;
    this.currentBatteryLevel = 100;

    this.informationService = this.getInformationService();
    this.temperatureService = this.getTemperatureService();
    this.humidityService = this.getHumidityService();
    this.batteryService = this.getBatteryService();

    this.scanner = new Scanner(this.log, this.config.address);
    this.scanner.start();
    this.scanner.on('temperatureChange', (temperature, peripheral) => {
      const { address } = peripheral;
      this.log.debug(`[${address}] Temperature: ${temperature}C`);
      this.temperature = temperature;
    });
    this.scanner.on('humidityChange', (humidity, peripheral) => {
      const { address } = peripheral;
      this.log.debug(`[${address}] Humidity: ${humidity}%`);
      this.humidity = humidity;
    });
    this.scanner.on('batteryChange', (batteryLevel, peripheral) => {
      const { address } = peripheral;
      this.log.debug(`[${address}] Battery level: ${batteryLevel}%`);
      this.batteryLevel = batteryLevel;
    });
    this.scanner.on('error', (error) => {
      this.log.error(error);
    });
    this.log.debug('Initialized accessory');
  }
  set temperature(newValue) {
    this.currentTemperature = newValue;
    this.temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(newValue);
  }

  get temperature() {
    return this.currentTemperature;
  }

  set humidity(newValue) {
    this.currentHumidity = newValue;
    this.humidityService
      .getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .updateValue(newValue);
  }

  get humidity() {
    return this.currentHumidity;
  }

  set batteryLevel(newValue) {
    this.currentBatteryLevel = newValue;
    this.batteryService
      .getCharacteristic(Characteristic.BatteryLevel)
      .updateValue(newValue);
  }

  get batteryLevel() {
    return this.currentBatteryLevel;
  }

  getInformationService() {
    return new Service.AccessoryInformation()
      .setCharacteristic(Characteristic.Manufacturer, 'Xiaomi')
      .setCharacteristic(Characteristic.Model, 'Mi Bluetooth Temperature & Humidity Monitor')
      .setCharacteristic(Characteristic.SerialNumber, 'LYWSDCGQ/01ZM');
  }

  getTemperatureService() {
    const temperatureService = new Service.TemperatureSensor('Temperature');
    temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on('get', callback => callback(null, this.temperature));
    temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({ minValue: -10 });
    temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({ maxValue: 60 });
    return temperatureService;
  }

  getHumidityService() {
    const humidityService = new Service.HumiditySensor('Humidity');
    humidityService
      .getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .on('get', callback => callback(null, this.humidity));
    return humidityService;
  }

  getBatteryService() {
    const batteryService = new Service.BatteryService('Battery');
    batteryService.getCharacteristic(Characteristic.BatteryLevel)
      .on('get', callback => callback(null, this.batteryLevel));
    batteryService.getCharacteristic(Characteristic.StatusLowBattery)
      .on('get', (callback) => {
        if (this.batteryLevel > 10) {
          callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
        } else {
          callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
        }
      });
    return batteryService;
  }
  getServices() {
    return [
      this.informationService,
      this.temperatureService,
      this.humidityService,
      this.batteryService,
    ];
  }
}

module.exports = (hap) => {
  Service = hap.Service; // eslint-disable-line prefer-destructuring
  Characteristic = hap.Characteristic; // eslint-disable-line prefer-destructuring
  return { MiHygrothermographAccessory };
};
