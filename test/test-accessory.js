const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const { describe, it, beforeEach } = require('mocha');
const {
  CharacteristicMock, ServiceMock, ScannerMock, mockLogger,
} = require('./mocks');


describe('accessory', () => {
  beforeEach(() => {
    proxyquire('../lib/accessory', {
      './scanner': {
        Scanner: ScannerMock,
      },
    });

    this.characteristics = {
      BatteryLevel: new CharacteristicMock(),
      StatusLowBattery: new CharacteristicMock(),
      ChargingState: new CharacteristicMock(),
      Manufacturer: new CharacteristicMock(),
      Model: new CharacteristicMock(),
      SerialNumber: new CharacteristicMock(),
      CurrentTemperature: new CharacteristicMock(),
      CurrentRelativeHumidity: new CharacteristicMock(),
    };

    this.services = {
      BatteryService: ServiceMock,
      HumiditySensor: ServiceMock,
      TemperatureSensor: ServiceMock,
      AccessoryInformation: ServiceMock,
    };

    const mockedHap = {
      Service: this.services,
      Characteristic: this.characteristics,
    };
    // eslint-disable-next-line global-require
    const { MiHygrothermographAccessory } = require('../lib/accessory')(mockedHap);
    this.MiHygrothermographAccessory = MiHygrothermographAccessory;
  });

  it('should update current temperature', () => {
    const accessory = new this.MiHygrothermographAccessory(mockLogger, {});
    accessory.scanner.emit('temperatureChange', 20.5, { address: '123', id: '123' });
    assert.equal(accessory.currentTemperature, 20.5);
    accessory.scanner.emit('temperatureChange', 25.5, { address: '123', id: '123' });
    assert.equal(accessory.currentTemperature, 25.5);
  });

  it('should update current humidity', () => {
    const accessory = new this.MiHygrothermographAccessory(mockLogger, {});
    accessory.scanner.emit('humidityChange', 30.5, { address: '123', id: '123' });
    assert.equal(accessory.currentHumidity, 30.5);
    accessory.scanner.emit('humidityChange', 35.5, { address: '123', id: '123' });
    assert.equal(accessory.currentHumidity, 35.5);
  });

  it('should update current battery level', () => {
    const accessory = new this.MiHygrothermographAccessory(mockLogger, {});
    accessory.scanner.emit('batteryChange', 90, { address: '123', id: '123' });
    assert.equal(accessory.currentBatteryLevel, 90);
    accessory.scanner.emit('batteryChange', 9, { address: '123', id: '123' });
    assert.equal(accessory.currentBatteryLevel, 9);
  });

  it('should receive error', () => {
    const spyLogger = sinon.spy(mockLogger, 'error');
    const accessory = new this.MiHygrothermographAccessory(mockLogger, {});
    accessory.scanner.emit('error', new Error('error'));
    assert(spyLogger.called);
  });

  it('should answer temperature characteristic get value', () => {
    const temperatureSpy = sinon.spy();
    const accessory = new this.MiHygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.CurrentTemperature;
    accessory.temperature = 23;
    characteristic.emit('get', temperatureSpy);
    assert(temperatureSpy.calledWith(null, 23));
  });

  it('should answer humidity characteristic get value', () => {
    const humiditySpy = sinon.spy();
    const accessory = new this.MiHygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.CurrentRelativeHumidity;
    accessory.humidity = 30;
    characteristic.emit('get', humiditySpy);
    assert(humiditySpy.calledWith(null, 30));
  });

  it('should answer low battery characteristic get value', () => {
    const lowBatterySpy = sinon.spy();
    const accessory = new this.MiHygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.StatusLowBattery;
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
    const accessory = new this.MiHygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.BatteryLevel;
    // Low battery
    accessory.batteryLevel = 99;
    characteristic.emit('get', batterySpy);
    assert(batterySpy.calledWith(null, 99));
  });

  it('should return all services', () => {
    const accessory = new this.MiHygrothermographAccessory(mockLogger, {});
    const services = accessory.getServices();
    assert(services.length, 4);
  });

  it('should set address config', () => {
    const config = { address: 'deadbeef' };
    const accessory = new this.MiHygrothermographAccessory(mockLogger, config);
    assert.deepEqual(config, accessory.config);
  });
});
