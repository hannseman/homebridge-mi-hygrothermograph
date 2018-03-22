const assert = require('assert');
const EventEmitter = require('events');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const { describe, it, beforeEach } = require('mocha');

class CharacteristicMock extends EventEmitter {
  constructor() {
    super();
    this.BATTERY_LEVEL_NORMAL = 1;
    this.BATTERY_LEVEL_LOW = 0;

  }
  setProps() { return this; }
  updateValue() { return this; }
}
const mockCharacteristics = {
  BatteryLevel: new CharacteristicMock(),
  StatusLowBattery: new CharacteristicMock(),
  Manufacturer: new CharacteristicMock(),
  Model: new CharacteristicMock(),
  SerialNumber: new CharacteristicMock(),
  CurrentTemperature: new CharacteristicMock(),
  CurrentRelativeHumidity: new CharacteristicMock(),
};
class ServiceMock {
  setCharacteristic() { return this; }
  getCharacteristic(type) {
    return type;
  }
}

class ScannerMock extends EventEmitter {
  start() {}
}


describe('accessory', () => {
  beforeEach(() => {
    this.mockLogger = { debug() { }, error() { } };

    proxyquire('../lib/accessory', {
      './scanner': {
        Scanner: ScannerMock,
      },
    });

    // Clear listeners
    Object.keys(mockCharacteristics).forEach((type) => {
      mockCharacteristics[type].removeAllListeners();
    });
    this.mockServices = {
      BatteryService: ServiceMock,
      HumiditySensor: ServiceMock,
      TemperatureSensor: ServiceMock,
      AccessoryInformation: ServiceMock,
    };

    this.mockHap = {
      Service: this.mockServices,
      Characteristic: mockCharacteristics,
    };
    // eslint-disable-next-line global-require
    const { MiHygrothermographAccessory } = require('../lib/accessory')(this.mockHap);
    this.MiHygrothermographAccessory = MiHygrothermographAccessory;
  });

  it('should update current temperature', () => {
    const accessory = new this.MiHygrothermographAccessory(this.mockLogger, {});
    accessory.scanner.emit('temperatureChange', 20.5, { address: '123', id: '123' });
    assert.equal(accessory.currentTemperature, 20.5);
    accessory.scanner.emit('temperatureChange', 25.5, { address: '123', id: '123' });
    assert.equal(accessory.currentTemperature, 25.5);
  });
  it('should update current humidity', () => {
    const accessory = new this.MiHygrothermographAccessory(this.mockLogger, {});
    accessory.scanner.emit('humidityChange', 30.5, { address: '123', id: '123' });
    assert.equal(accessory.currentHumidity, 30.5);
    accessory.scanner.emit('humidityChange', 35.5, { address: '123', id: '123' });
    assert.equal(accessory.currentHumidity, 35.5);
  });

  it('should update current battery level', () => {
    const accessory = new this.MiHygrothermographAccessory(this.mockLogger, {});
    accessory.scanner.emit('batteryChange', 90, { address: '123', id: '123' });
    assert.equal(accessory.currentBatteryLevel, 90);
    accessory.scanner.emit('batteryChange', 9, { address: '123', id: '123' });
    assert.equal(accessory.currentBatteryLevel, 9);
  });

  it('should receive error', () => {
    const spyLogger = sinon.spy(this.mockLogger, 'error');
    const accessory = new this.MiHygrothermographAccessory(this.mockLogger, {});
    accessory.scanner.emit('error', new Error('error'));
    assert(spyLogger.called);
  });

  it('should answer temperature characteristic get value', () => {
    const temperatureSpy = sinon.spy();
    const accessory = new this.MiHygrothermographAccessory(this.mockLogger, {});
    const characteristic = mockCharacteristics.CurrentTemperature;
    accessory.temperature = 23;
    characteristic.emit('get', temperatureSpy);
    assert(temperatureSpy.calledWith(null, 23));
  });

  it('should answer humidity characteristic get value', () => {
    const humiditySpy = sinon.spy();
    const accessory = new this.MiHygrothermographAccessory(this.mockLogger, {});
    const characteristic = mockCharacteristics.CurrentRelativeHumidity;
    accessory.humidity = 30;
    characteristic.emit('get', humiditySpy);
    assert(humiditySpy.calledWith(null, 30));
  });

  it('should answer low battery characteristic get value', () => {
    const lowBatterySpy = sinon.spy();
    const accessory = new this.MiHygrothermographAccessory(this.mockLogger, {});
    const characteristic = mockCharacteristics.StatusLowBattery;
    // Low battery
    accessory.batteryLevel = 9;
    characteristic.emit('get', lowBatterySpy);
    assert(lowBatterySpy.calledWith(null, characteristic.BATTERY_LEVEL_LOW));
    // Normal battery
    accessory.batteryLevel = 15;
    characteristic.emit('get', lowBatterySpy);
    assert(lowBatterySpy.calledWith(null, characteristic.BATTERY_LEVEL_NORMAL));
  });

  it('should answer battery level characteristic get value', () => {
    const batterySpy = sinon.spy();
    const accessory = new this.MiHygrothermographAccessory(this.mockLogger, {});
    const characteristic = mockCharacteristics.BatteryLevel;
    // Low battery
    accessory.batteryLevel = 99;
    characteristic.emit('get', batterySpy);
    assert(batterySpy.calledWith(null, 99));
  });

  it('should return all services', () => {
    const accessory = new this.MiHygrothermographAccessory(this.mockLogger, {});
    const services = accessory.getServices();
    assert(services.length, 4);
  });
  
});
