const assert = require("assert");
const proxyquire = require("proxyquire").noCallThru();
const sinon = require("sinon");
const { describe, it, beforeEach, afterEach } = require("mocha");
const {
  CharacteristicMock,
  ServiceMock,
  FakeGatoHistoryServiceMock,
  nobleMock,
  mqttMock,
  mockLogger
} = require("./mocks");

const { Scanner } = proxyquire("../lib/scanner", {
  noble: nobleMock
});

describe("accessory", () => {
  beforeEach(() => {
    this.characteristics = {
      BatteryLevel: new CharacteristicMock(),
      StatusLowBattery: new CharacteristicMock(),
      ChargingState: new CharacteristicMock(),
      Manufacturer: new CharacteristicMock(),
      FirmwareRevision: new CharacteristicMock(),
      Model: new CharacteristicMock(),
      SerialNumber: new CharacteristicMock(),
      CurrentTemperature: new CharacteristicMock(),
      CurrentRelativeHumidity: new CharacteristicMock()
    };

    this.services = {
      BatteryService: ServiceMock,
      HumiditySensor: ServiceMock,
      TemperatureSensor: ServiceMock,
      AccessoryInformation: ServiceMock
    };

    this.homebridgeMock = {
      hap: {
        Service: this.services,
        Characteristic: this.characteristics
      },
      user: {
        storagePath: () => "/tmp/"
      }
    };

    const { HygrothermographAccessory } = proxyquire("../lib/accessory", {
      "./scanner": {
        Scanner
      },
      "fakegato-history": () => FakeGatoHistoryServiceMock,
      mqtt: mqttMock
    })(this.homebridgeMock);

    this.HygrothermographAccessory = HygrothermographAccessory;
  });

  afterEach(() => {
    nobleMock.removeAllListeners();
  });

  it("should update current temperature", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    accessory.scanner.emit("temperatureChange", 20.5, {
      address: "123",
      id: "123"
    });
    assert.strictEqual(accessory.latestTemperature, 20.5);
    accessory.scanner.emit("temperatureChange", 25.5, {
      address: "123",
      id: "123"
    });
    assert.strictEqual(accessory.latestTemperature, 25.5);
  });

  it("should update current humidity", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    accessory.scanner.emit("humidityChange", 30.5, {
      address: "123",
      id: "123"
    });
    assert.strictEqual(accessory.latestHumidity, 30.5);
    accessory.scanner.emit("humidityChange", 35.5, {
      address: "123",
      id: "123"
    });
    assert.strictEqual(accessory.latestHumidity, 35.5);
  });

  it("should update current battery level", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    accessory.scanner.emit("batteryChange", 90, { address: "123", id: "123" });
    assert.strictEqual(accessory.latestBatteryLevel, 90);
    accessory.scanner.emit("batteryChange", 9, { address: "123", id: "123" });
    assert.strictEqual(accessory.latestBatteryLevel, 9);
  });

  it("should receive error", () => {
    const spyLogger = sinon.spy(mockLogger, "error");
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    accessory.scanner.emit("error", new Error("error"));
    assert(spyLogger.called);
    spyLogger.restore();
  });

  it("should answer temperature characteristic get value", () => {
    const temperatureSpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.CurrentTemperature;
    accessory.temperature = 23;
    characteristic.emit("get", temperatureSpy);
    assert(temperatureSpy.calledWith(null, 23));
  });

  it("should error on undefined temperature characteristic get value ", () => {
    const temperatureSpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.CurrentTemperature;
    assert.strictEqual(accessory.temperature, undefined);
    characteristic.emit("get", temperatureSpy);
    assert(temperatureSpy.calledWith(sinon.match.instanceOf(Error)));
  });

  it("should error on timeout temperature characteristic get value", () => {
    const temperatureSpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.CurrentTemperature;
    assert.strictEqual(accessory.lastUpdatedAt, undefined);
    accessory.temperature = 25;
    assert.notStrictEqual(accessory.lastUpdatedAt, undefined);
    const clock = sinon.useFakeTimers(
      Date.now() + 1000 * 60 * accessory.timeout
    );
    characteristic.emit("get", temperatureSpy);
    assert(temperatureSpy.calledWith(sinon.match.instanceOf(Error)));
    clock.restore();
  });

  it("should answer humidity characteristic get value", () => {
    const humiditySpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.CurrentRelativeHumidity;
    accessory.humidity = 30;
    characteristic.emit("get", humiditySpy);
    assert(humiditySpy.calledWith(null, 30));
  });

  it("should error on undefined humidity characteristic get value ", () => {
    const humiditySpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.CurrentRelativeHumidity;
    assert.strictEqual(accessory.humidity, undefined);
    characteristic.emit("get", humiditySpy);
    assert(humiditySpy.calledWith(sinon.match.instanceOf(Error)));
  });

  it("should error on timeout humidity characteristic get value", () => {
    const humiditySpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.CurrentRelativeHumidity;
    assert.strictEqual(accessory.lastUpdatedAt, undefined);
    accessory.humidity = 30;
    assert.notStrictEqual(accessory.lastUpdatedAt, undefined);
    const clock = sinon.useFakeTimers(
      Date.now() + 1000 * 60 * accessory.timeout
    );
    characteristic.emit("get", humiditySpy);
    assert(humiditySpy.calledWith(sinon.match.instanceOf(Error)));
    clock.restore();
  });

  it("should answer low battery characteristic get value", () => {
    const lowBatterySpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.StatusLowBattery;
    // Low battery
    accessory.batteryLevel = 9;
    characteristic.emit("get", lowBatterySpy);
    assert(lowBatterySpy.calledWith(null, characteristic.BATTERY_LEVEL_LOW));
    // Normal battery
    accessory.batteryLevel = 15;
    characteristic.emit("get", lowBatterySpy);
    assert(lowBatterySpy.calledWith(null, characteristic.BATTERY_LEVEL_NORMAL));
  });

  it("should error on undefined low battery characteristic get value", () => {
    const lowBatterySpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.StatusLowBattery;
    assert.strictEqual(accessory.batteryLevel, undefined);
    characteristic.emit("get", lowBatterySpy);
    assert(lowBatterySpy.calledWith(sinon.match.instanceOf(Error)));
  });

  it("should answer battery level characteristic get value", () => {
    const batterySpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.BatteryLevel;
    // Low battery
    accessory.batteryLevel = 99;
    characteristic.emit("get", batterySpy);
    assert(batterySpy.calledWith(null, 99));
  });

  it("should error on undefined battery level characteristic get value ", () => {
    const batterySpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.BatteryLevel;
    assert.strictEqual(accessory.batteryLevel, undefined);
    characteristic.emit("get", batterySpy);
    assert(batterySpy.calledWith(sinon.match.instanceOf(Error)));
  });

  it("should error on timeout humidity characteristic get value", () => {
    const batterySpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.BatteryLevel;
    assert.strictEqual(accessory.lastUpdatedAt, undefined);
    accessory.batteryLevel = 99;
    assert.notStrictEqual(accessory.lastUpdatedAt, undefined);
    const clock = sinon.useFakeTimers(
      Date.now() + 1000 * 60 * accessory.timeout
    );
    characteristic.emit("get", batterySpy);
    assert(batterySpy.calledWith(sinon.match.instanceOf(Error)));
    clock.restore();
  });

  it("should return all services", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const services = accessory.getServices();
    assert.strictEqual(services.length, 4);
  });

  it("should set address config", () => {
    const config = { address: "deadbeef" };
    const accessory = new this.HygrothermographAccessory(mockLogger, config);
    assert.deepStrictEqual(config, accessory.config);
  });

  it("should set timeout config", () => {
    const config = { timeout: 25 };
    const accessory = new this.HygrothermographAccessory(mockLogger, config);
    assert.deepStrictEqual(config, accessory.config);
    assert.strictEqual(config.timeout, accessory.timeout);
  });

  it("should return timed out true when timed out", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    accessory.lastUpdatedAt = Date.now();
    const clock = sinon.useFakeTimers(
      Date.now() + 1000 * 60 * (accessory.timeout + 15)
    );
    assert(accessory.hasTimedOut());
    clock.restore();
  });

  it("should return timed out false when not timed out", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    accessory.lastUpdatedAt = Date.now();
    const clock = sinon.useFakeTimers(
      Date.now() + 1000 * 60 * (accessory.timeout - 5)
    );
    assert(!accessory.hasTimedOut());
    clock.restore();
  });

  it("should return timed out false when set as 0", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      timeout: 0
    });
    accessory.lastUpdatedAt = Date.now();
    const clock = sinon.useFakeTimers(
      Date.now() + 1000 * 60 * (accessory.timeout + 15)
    );
    assert(!accessory.hasTimedOut());
    clock.restore();
  });

  it("should return timed out false with undefined timestamp", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const clock = sinon.useFakeTimers(
      Date.now() + 1000 * 60 * (accessory.timeout + 15)
    );
    assert(!accessory.hasTimedOut());
    clock.restore();
  });

  it("should have custom temperature name when configured", () => {
    const temperatureName = "CustomTemperatureName";
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      temperatureName
    });
    assert.strictEqual(accessory.temperatureName, temperatureName);
  });

  it("should have default temperature name when not configured", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    assert.strictEqual(accessory.temperatureName, "Temperature");
  });

  it("should have custom humidity name when configured", () => {
    const humidityName = "CustomHumidityName";
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      humidityName
    });
    assert.strictEqual(accessory.humidityName, humidityName);
  });

  it("should have default humidity name when not configured", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    assert.strictEqual(accessory.humidityName, "Humidity");
  });

  it("should get serial number from configured address", () => {
    const address = "de:ad:be:ef";
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      address
    });
    assert.strictEqual(accessory.serialNumber, "deadbeef");
  });

  it("should have undefined serial number of no configured address", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    assert.strictEqual(accessory.serialNumber, undefined);
  });

  it("should setup fakeGatoHistoryService when configured", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      fakeGatoEnabled: true
    });
    assert(accessory.fakeGatoHistoryService !== undefined);
  });

  it("should not setup fakeGatoHistoryService when not configured", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      fakeGatoEnabled: false
    });
    assert.strictEqual(accessory.fakeGatoHistoryService, undefined);
  });

  it("should add fakegato to getServices when configured", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      fakeGatoEnabled: true
    });
    const services = accessory.getServices();
    assert.strictEqual(services.length, 5);
  });

  it("should use custom fakegato storage path when configured", () => {
    const path = "/home/bridge/";
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      fakeGatoEnabled: true,
      fakeGatoStoragePath: path
    });
    assert.strictEqual(accessory.fakeGatoStoragePath, path);
  });

  it("should use homebridge storage path for fakegato storage when not configured", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      fakeGatoEnabled: true
    });
    assert.strictEqual(
      accessory.fakeGatoStoragePath,
      this.homebridgeMock.user.storagePath()
    );
  });

  it("should add temperature entry", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      fakeGatoEnabled: true
    });
    const spy = sinon.spy(accessory.fakeGatoHistoryService, "addEntry");
    accessory.latestHumidity = 34.0;
    accessory.temperature = 28.0;
    assert(spy.called);
    assert.strictEqual(spy.args[0][0].temp, 28.0);
    assert.strictEqual(spy.args[0][0].humidity, 34.0);
  });

  it("should add humidity entry", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      fakeGatoEnabled: true
    });
    const spy = sinon.spy(accessory.fakeGatoHistoryService, "addEntry");
    accessory.latestTemperature = 28.0;
    accessory.humidity = 34.0;
    assert(spy.called);
    assert.strictEqual(spy.args[0][0].humidity, 34.0);
    assert.strictEqual(spy.args[0][0].temp, 28.0);
  });

  it("should publish temperature to mqtt", () => {
    const topic = "sensors/temperature";
    const value = 19.0;
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      mqtt: {
        url: "mqtt://127.0.0.1",
        temperatureTopic: topic
      }
    });
    assert.notEqual(accessory.mqttClient, null);
    const publishSpy = sinon.spy(accessory.mqttClient, "publish");
    accessory.temperature = value;
    accessory.battery = 10;
    assert(publishSpy.calledOnce);
    assert.strictEqual(publishSpy.args[0][0], topic);
    assert.strictEqual(publishSpy.args[0][1], String(value));
  });

  it("should publish humidity to mqtt", () => {
    const topic = "sensors/humidity";
    const value = 25.5;
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      mqtt: {
        url: "mqtt://127.0.0.1",
        humidityTopic: topic
      }
    });
    assert.notEqual(accessory.mqttClient, null);
    const publishSpy = sinon.spy(accessory.mqttClient, "publish");
    accessory.humidity = value;
    accessory.temperature = 23;
    assert(publishSpy.calledOnce);
    assert.strictEqual(publishSpy.args[0][0], topic);
    assert.strictEqual(publishSpy.args[0][1], String(value));
  });

  it("should publish battery to mqtt", () => {
    const topic = "sensors/battery";
    const value = 93;
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      mqtt: {
        url: "mqtt://127.0.0.1",
        batteryTopic: topic
      }
    });
    assert.notEqual(accessory.mqttClient, null);
    const publishSpy = sinon.spy(accessory.mqttClient, "publish");
    accessory.batteryLevel = value;
    accessory.temperature = 23;
    assert(publishSpy.calledOnce);
    assert.strictEqual(publishSpy.args[0][0], topic);
    assert.strictEqual(publishSpy.args[0][1], String(value));
  });

  it("should not configure mqtt client when not configured", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    assert.equal(accessory.mqttClient, null);
  });

  it("should log on mqtt events", () => {
    const spyErrorLogger = sinon.spy(mockLogger, "error");
    const spyInfoLogger = sinon.spy(mockLogger, "info");
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      mqtt: {
        url: "mqtt://127.0.0.1",
        batteryTopic: "battery/"
      }
    });
    accessory.mqttClient.emit("error", new Error("error"));
    assert(spyErrorLogger.calledOnce);
    accessory.mqttClient.emit("connect");
    assert(spyInfoLogger.calledOnce);
    spyInfoLogger.restore();
    accessory.mqttClient.emit("close");
    assert(spyInfoLogger.calledOnce);
  });
});
