const Scanner = require('./scanner');

class MiHygrothermographAccessory {
  constructor() {
    this.temperature = 0.0;
    this.humidity = 0.0;
    this.batteryLevel = 0;
    Scanner.start();
    Scanner.on('temperateChange', (temperature) => {
      this.temperature = temperature;
    });
    Scanner.on('humidityChange', (humidity) => {
      this.humidity = humidity;
    });
    Scanner.on('batteryChange', (batteryLevel) => {
      this.batteryLevel = batteryLevel;
    });
  }

  get informationService() {
    return new Service.AccessoryInformation()
      .setCharacteristic(Characteristic.Manufacturer, 'Xiaomi')
      .setCharacteristic(Characteristic.Model, 'Mi Bluetooth Temperature & Humidity Monitor')
      .setCharacteristic(Characteristic.SerialNumber, 'LYWSDCGQ/01ZM');
  }

  get temperatureService() {
    const temperatureService = new Service.TemperatureSensor('Temperature');
    temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on('get', callback => callback(this.temperature));
    temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({ minValue: -10 });
    temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({ maxValue: 60 });
    return temperatureService;
  }

  get humidityService() {
    const humidityService = new Service.HumiditySensor('Humidity');
    humidityService
      .getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .on('get', callback => callback(this.humidity));
    return humidityService;
  }

  get batteryService() {
    const batteryService = new Service.BatteryService('Battery');
    batteryService.getCharacteristic(Characteristic.BatteryLevel)
      .on('get', callback => callback(this.batteryLevel));
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

module.exports = {
  MiHygrothermographAccessory,
};
