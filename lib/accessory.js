const { Scanner } = require('./scanner');

let Service;
let Characteristic;

class MiHygrothermographAccessory {
  constructor(log, config) {
    this.log = log;
    this.config = config;

    this.currentTemperature = 0.0;
    this.currentHumidity = 0.0;
    this.currentBatteryLevel = 0;

    this.informationService = this.getInformationService();
    this.temperatureService = this.getTemperatureService();
    this.humidityService = this.getHumidityService();
    this.batteryService = this.getBatteryService();

    this.scanner = new Scanner(this.log);
    this.scanner.start();
    this.scanner.on('temperatureChange', (temperature) => {
      this.temperature = temperature;
    });
      this.log('Humidity: ', humidity);
    this.scanner.on('humidityChange', (humidity) => {
      this.humidity = humidity;
    });
      this.log('Battery level: ', batteryLevel);
    this.scanner.on('batteryChange', (batteryLevel) => {
      this.batteryLevel = batteryLevel;
    });
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
