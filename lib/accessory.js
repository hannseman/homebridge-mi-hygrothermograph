const { Scanner } = require('./scanner');

let Service;
let Characteristic;
const defaultTimeout = 15;

class HygrothermographAccessory {
  constructor(log, config) {
    this.log = log;
    this.config = config;

    this.latestTemperature = undefined;
    this.latestHumidity = undefined;
    this.latestBatteryLevel = undefined;

    this.lastUpdatedAt = undefined;
    this.timeout = config.timeout || defaultTimeout;

    this.informationService = this.getInformationService();
    this.temperatureService = this.getTemperatureService();
    this.humidityService = this.getHumidityService();
    this.batteryService = this.getBatteryService();

    this.scanner = new Scanner(this.log, this.config.address);
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

    this.scanner.start();
    this.log.debug('Initialized accessory');
  }
  set temperature(newValue) {
    this.latestTemperature = newValue;
    this.lastUpdatedAt = Date.now();
    this.temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(newValue);
  }

  get temperature() {
    if (this.hasTimedOut()) {
      return undefined;
    }
    return this.latestTemperature;
  }

  set humidity(newValue) {
    this.latestHumidity = newValue;
    this.lastUpdatedAt = Date.now();
    this.humidityService
      .getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .updateValue(newValue);
  }

  get humidity() {
    if (this.hasTimedOut()) {
      return undefined;
    }
    return this.latestHumidity;
  }

  set batteryLevel(newValue) {
    this.latestBatteryLevel = newValue;
    this.lastUpdatedAt = Date.now();
    this.batteryService
      .getCharacteristic(Characteristic.BatteryLevel)
      .updateValue(newValue);
  }

  get batteryLevel() {
    if (this.hasTimedOut()) {
      return undefined;
    }
    return this.latestBatteryLevel;
  }

  hasTimedOut() {
    if (this.lastUpdatedAt === undefined) {
      return false;
    }
    const timeoutMilliseconds = 1000 * 60 * this.timeout;
    return this.lastUpdatedAt <= (Date.now() - timeoutMilliseconds);
  }

  getInformationService() {
    return new Service.AccessoryInformation()
      .setCharacteristic(Characteristic.Manufacturer, 'Xiaomi')
      .setCharacteristic(Characteristic.Model, 'Mi Bluetooth Temperature & Humidity Monitor')
      .setCharacteristic(Characteristic.SerialNumber, 'LYWSDCGQ/01ZM');
  }

  onCharacteristicGetValue(callback, value) {
    if (value === undefined) {
      callback(new Error('Undefined characteristic value'));
    } else {
      callback(null, value);
    }
  }

  get temperatureName() {
    return this.config.temperatureName || 'Temperature';
  }

  get humidityName() {
    return this.config.humidityName || 'Humidity';
  }

  getTemperatureService() {
    const temperatureService = new Service.TemperatureSensor(this.temperatureName);
    temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on('get', callback => this.onCharacteristicGetValue(callback, this.temperature));
    temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({ minValue: -10 });
    temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({ maxValue: 60 });
    return temperatureService;
  }

  getHumidityService() {
    const humidityService = new Service.HumiditySensor(this.humidityName);
    humidityService
      .getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .on('get', callback => this.onCharacteristicGetValue(callback, this.humidity));
    return humidityService;
  }

  getBatteryService() {
    const batteryService = new Service.BatteryService('Battery');
    batteryService.getCharacteristic(Characteristic.BatteryLevel)
      .on('get', callback => this.onCharacteristicGetValue(callback, this.batteryLevel));
    batteryService.setCharacteristic(
      Characteristic.ChargingState,
      Characteristic.ChargingState.NOT_CHARGEABLE
    );
    batteryService.getCharacteristic(Characteristic.StatusLowBattery)
      .on('get', (callback) => {
        let batteryStatus;
        if (this.batteryLevel === undefined) {
          batteryStatus = undefined;
        } else if (this.batteryLevel > 10) {
          batteryStatus = Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
        } else {
          batteryStatus = Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
        }
        this.onCharacteristicGetValue(callback, batteryStatus);
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
  return { HygrothermographAccessory };
};
