const Scanner = require('./scanner');

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

    Scanner.start();
    Scanner.on('temperatureChange', (temperature) => {
      this.log('Temperature: ', temperature);
      this.temperature = temperature;
    });
    Scanner.on('humidityChange', (humidity) => {
      this.log('Humidity: ', humidity);
      this.humidity = humidity;
    });
    Scanner.on('batteryChange', (batteryLevel) => {
      this.log('Battery level: ', batteryLevel);
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
  Accessory = hap.Accessory;
  Service = hap.Service;
  Characteristic = hap.Characteristic;
  return { MiHygrothermographAccessory };
};
