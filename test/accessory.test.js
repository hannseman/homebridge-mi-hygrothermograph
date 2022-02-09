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
  mockLogger,
} = require("./mocks");

const { Scanner } = proxyquire("../lib/scanner", {
  "@abandonware/noble": nobleMock,
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
      CurrentRelativeHumidity: new CharacteristicMock(),
      CurrentAmbientLightLevel: new CharacteristicMock(),
    };

    this.services = {
      BatteryService: ServiceMock,
      HumiditySensor: ServiceMock,
      TemperatureSensor: ServiceMock,
      LightSensor: ServiceMock,
      AccessoryInformation: ServiceMock,
    };

    this.homebridgeMock = {
      hap: {
        Service: this.services,
        Characteristic: this.characteristics,
      },
      user: {
        storagePath: () => "/tmp/",
      },
    };

    const { HygrothermographAccessory, AccessoryType } = proxyquire(
      "../lib/accessory",
      {
        "./scanner": {
          Scanner,
        },
        "fakegato-history": () => FakeGatoHistoryServiceMock,
        mqtt: mqttMock,
      }
    )(this.homebridgeMock);

    this.AccessoryType = AccessoryType;
    this.HygrothermographAccessory = HygrothermographAccessory;
  });

  afterEach(() => {
    nobleMock.removeAllListeners();
    sinon.restore();
  });

  it("should initialize without config param", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger);
    assert(accessory.config);
  });

  it("should initialize Hygrothermograph type without config param", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger);
    assert.strictEqual(accessory.type, this.AccessoryType.Hygrotermograph);
  });

  it("should throw on unknown accessory type", () => {
    assert.throws(() => {
      new this.HygrothermographAccessory(mockLogger, {
        type: "foo-bar",
      });
    }, /Unsupported accessory type "foo-bar"/);
  });

  it("should update current temperature", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.CurrentTemperature;
    const updateValueSpy = sinon.spy(characteristic, "updateValue");
    accessory.scanner.emit("temperatureChange", 20.5, {
      address: "123",
      id: "123",
    });
    assert.strictEqual(accessory.latestTemperature, 20.5);
    accessory.scanner.emit("temperatureChange", 25.5, {
      address: "123",
      id: "123",
    });
    assert.strictEqual(accessory.latestTemperature, 25.5);
    assert(updateValueSpy.called);
    accessory.scanner.emit("temperatureChange", 25.5, {
      id: "123",
    });
  });

  it("should not update temperature characteristic when using update interval", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      updateInterval: 60,
    });
    const characteristic = this.characteristics.CurrentTemperature;
    const updateValueSpy = sinon.spy(characteristic, "updateValue");
    accessory.scanner.emit("temperatureChange", 25.5, {
      address: "123",
      id: "123",
    });
    assert(updateValueSpy.called === false);
  });

  it("should update current humidity", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.CurrentRelativeHumidity;
    const updateValueSpy = sinon.spy(characteristic, "updateValue");
    accessory.scanner.emit("humidityChange", 30.5, {
      address: "123",
      id: "123",
    });
    assert.strictEqual(accessory.latestHumidity, 30.5);
    accessory.scanner.emit("humidityChange", 35.5, {
      address: "123",
      id: "123",
    });
    assert.strictEqual(accessory.latestHumidity, 35.5);
    assert(updateValueSpy.called);
    accessory.scanner.emit("humidityChange", 35.5, {
      id: "123",
    });
  });

  it("should update current fertility", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
    });
    accessory.scanner.emit("fertilityChange", 500, {
      address: "123",
      id: "123",
    });
    assert.strictEqual(accessory.latestFertility, 500);
    accessory.scanner.emit("fertilityChange", 500, {
      address: "123",
      id: "123",
    });
    assert.strictEqual(accessory.latestFertility, 500);
    accessory.scanner.emit("fertilityChange", 500, {
      id: "123",
    });
  });

  it("should update current moisture", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
    });
    const characteristic = this.characteristics.CurrentRelativeHumidity;
    const updateValueSpy = sinon.spy(characteristic, "updateValue");
    accessory.scanner.emit("moistureChange", 50.7, {
      address: "123",
      id: "123",
    });
    assert.strictEqual(accessory.latestMoisture, 50.7);
    accessory.scanner.emit("moistureChange", 50.7, {
      address: "123",
      id: "123",
    });
    assert.strictEqual(accessory.latestMoisture, 50.7);
    assert(updateValueSpy.called);
    accessory.scanner.emit("moistureChange", 50.7, {
      id: "123",
    });
  });

  it("should update current illuminance", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
    });
    const characteristic = this.characteristics.CurrentAmbientLightLevel;
    const updateValueSpy = sinon.spy(characteristic, "updateValue");
    accessory.scanner.emit("illuminanceChange", 3000, {
      address: "123",
      id: "123",
    });
    assert.strictEqual(accessory.latestIlluminance, 3000);
    accessory.scanner.emit("illuminanceChange", 3000, {
      address: "123",
      id: "123",
    });
    assert.strictEqual(accessory.latestIlluminance, 3000);
    assert(updateValueSpy.called);
    accessory.scanner.emit("illuminanceChange", 3000, {
      id: "123",
    });
  });

  it("should not update current fertility on non-MiFlora", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.CurrentRelativeHumidity;
    const updateValueSpy = sinon.spy(characteristic, "updateValue");
    accessory.scanner.emit("fertilityChange", 500, {
      address: "123",
      id: "123",
    });
    assert.strictEqual(accessory.latestFertility, undefined);
    assert(!updateValueSpy.called);
  });

  it("should not update humidity characteristic when using update interval", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      updateInterval: 60,
    });
    const characteristic = this.characteristics.CurrentRelativeHumidity;
    const updateValueSpy = sinon.spy(characteristic, "updateValue");
    accessory.scanner.emit("humidityChange", 25.0, {
      address: "123",
      id: "123",
    });
    assert(updateValueSpy.called === false);
  });

  it("should update current battery level", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.BatteryLevel;
    const updateValueSpy = sinon.spy(characteristic, "updateValue");
    accessory.scanner.emit("batteryChange", 90, { address: "123", id: "123" });
    assert.strictEqual(accessory.latestBatteryLevel, 90);
    accessory.scanner.emit("batteryChange", 9, { address: "123", id: "123" });
    assert.strictEqual(accessory.latestBatteryLevel, 9);
    assert(updateValueSpy.called);
    accessory.scanner.emit("batteryChange", 9, { id: "123" });
  });

  it("should not update battery characteristic when using update interval", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      updateInterval: 60,
    });
    const characteristic = this.characteristics.BatteryLevel;
    const updateValueSpy = sinon.spy(characteristic, "updateValue");
    accessory.scanner.emit("batteryChange", 90, { address: "123", id: "123" });
    assert(updateValueSpy.called === false);
  });

  it("should receive error", () => {
    const spyLogger = sinon.spy(mockLogger, "error");
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    accessory.scanner.emit("error", new Error("error"));
    assert(spyLogger.called);
  });

  it("should answer temperature characteristic get value", () => {
    const temperatureSpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.CurrentTemperature;
    accessory.setTemperature(23);
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
    accessory.setTemperature(25);
    assert.notStrictEqual(accessory.lastUpdatedAt, undefined);
    sinon.useFakeTimers(Date.now() + 1000 * 60 * accessory.timeout);
    characteristic.emit("get", temperatureSpy);
    assert(temperatureSpy.calledWith(sinon.match.instanceOf(Error)));
  });

  it("should answer humidity characteristic get value", () => {
    const humiditySpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.CurrentRelativeHumidity;
    accessory.setHumidity(30);
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
    accessory.setHumidity(30);
    assert.notStrictEqual(accessory.lastUpdatedAt, undefined);
    sinon.useFakeTimers(Date.now() + 1000 * 60 * accessory.timeout);
    characteristic.emit("get", humiditySpy);
    assert(humiditySpy.calledWith(sinon.match.instanceOf(Error)));
  });

  it("should answer low battery characteristic get value", () => {
    const lowBatterySpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger);
    const characteristic = this.characteristics.StatusLowBattery;
    // Low battery
    accessory.setBatteryLevel(9);
    characteristic.emit("get", lowBatterySpy);
    assert(lowBatterySpy.calledWith(null, characteristic.BATTERY_LEVEL_LOW));
    // Normal battery
    accessory.setBatteryLevel(15);
    characteristic.emit("get", lowBatterySpy);
    assert(lowBatterySpy.calledWith(null, characteristic.BATTERY_LEVEL_NORMAL));
  });

  it("should answer used configured low battery threshold", () => {
    const lowBatterySpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      lowBattery: 20,
    });
    const characteristic = this.characteristics.StatusLowBattery;
    // Low battery
    accessory.setBatteryLevel(9);
    characteristic.emit("get", lowBatterySpy);
    assert(lowBatterySpy.calledWith(null, characteristic.BATTERY_LEVEL_LOW));

    accessory.setBatteryLevel(15);
    characteristic.emit("get", lowBatterySpy);
    assert(lowBatterySpy.calledWith(null, characteristic.BATTERY_LEVEL_LOW));

    // Normal battery
    accessory.setBatteryLevel(21);
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
    accessory.setBatteryLevel(99);
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

  it("should error on timeout battery level characteristic get value", () => {
    const batterySpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const characteristic = this.characteristics.BatteryLevel;
    assert.strictEqual(accessory.lastUpdatedAt, undefined);
    accessory.setBatteryLevel(99);
    assert.notStrictEqual(accessory.lastUpdatedAt, undefined);
    sinon.useFakeTimers(Date.now() + 1000 * 60 * accessory.timeout);
    characteristic.emit("get", batterySpy);
    assert(batterySpy.calledWith(sinon.match.instanceOf(Error)));
  });

  it("should answer moisture characteristic get value", () => {
    const moistureSpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
    });
    const characteristic = this.characteristics.CurrentRelativeHumidity;
    accessory.setMoisture(23.5);
    characteristic.emit("get", moistureSpy);
    assert(moistureSpy.calledWith(null, 23.5));
  });

  it("should error on undefined moisture characteristic get value ", () => {
    const moistureSpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
    });
    const characteristic = this.characteristics.CurrentRelativeHumidity;
    assert.strictEqual(accessory.moisture, undefined);
    characteristic.emit("get", moistureSpy);
    assert(moistureSpy.calledWith(sinon.match.instanceOf(Error)));
  });

  it("should error on timeout moisture characteristic get value", () => {
    const moistureSpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
    });
    const characteristic = this.characteristics.CurrentRelativeHumidity;
    assert.strictEqual(accessory.lastUpdatedAt, undefined);
    accessory.setMoisture(23.5);
    assert.notStrictEqual(accessory.lastUpdatedAt, undefined);
    sinon.useFakeTimers(Date.now() + 1000 * 60 * accessory.timeout);
    characteristic.emit("get", moistureSpy);
    assert(moistureSpy.calledWith(sinon.match.instanceOf(Error)));
  });

  it("should answer fertility characteristic get value for MiFlora", () => {
    const fertilitySpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
    });
    const characteristic = this.characteristics.CurrentAmbientLightLevel;
    accessory.setFertility(500);
    characteristic.emit("get", fertilitySpy);
    assert(fertilitySpy.calledWith(null, 500));
  });

  it("should error on undefined fertility characteristic get value ", () => {
    const fertilitySpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
    });
    const characteristic = this.characteristics.CurrentAmbientLightLevel;
    assert.strictEqual(accessory.fertility, undefined);
    characteristic.emit("get", fertilitySpy);
    assert(fertilitySpy.calledWith(sinon.match.instanceOf(Error)));
  });

  it("should error on timeout fertility characteristic get value", () => {
    const fertilitySpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
    });
    const characteristic = this.characteristics.CurrentAmbientLightLevel;
    assert.strictEqual(accessory.lastUpdatedAt, undefined);
    accessory.setFertility(500);
    assert.notStrictEqual(accessory.lastUpdatedAt, undefined);
    sinon.useFakeTimers(Date.now() + 1000 * 60 * accessory.timeout);
    characteristic.emit("get", fertilitySpy);
    assert(fertilitySpy.calledWith(sinon.match.instanceOf(Error)));
  });

  it("should answer illuminance characteristic get value for MiFlora", () => {
    const illuminanceSpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
    });
    const characteristic = this.characteristics.CurrentAmbientLightLevel;
    accessory.setIlluminance(5000);
    characteristic.emit("get", illuminanceSpy);
    assert(illuminanceSpy.calledWith(null, 5000));
  });

  it("should answer min bound illuminance characteristic get value for MiFlora", () => {
    const illuminanceSpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
    });
    const characteristic = this.characteristics.CurrentAmbientLightLevel;
    accessory.setIlluminance(0);
    characteristic.emit("get", illuminanceSpy);
    assert(illuminanceSpy.calledWith(null, 0.0001));
  });

  it("should answer max bound illuminance characteristic get value for MiFlora", () => {
    const illuminanceSpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
    });
    const characteristic = this.characteristics.CurrentAmbientLightLevel;
    accessory.setIlluminance(99999999);
    characteristic.emit("get", illuminanceSpy);
    assert(illuminanceSpy.calledWith(null, 100000));
  });

  it("should error on undefined illuminance characteristic get value ", () => {
    const illuminanceSpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
    });
    const characteristic = this.characteristics.CurrentAmbientLightLevel;
    assert.strictEqual(accessory.illuminance, undefined);
    characteristic.emit("get", illuminanceSpy);
    assert(illuminanceSpy.calledWith(sinon.match.instanceOf(Error)));
  });

  it("should error on timeout illuminance characteristic get value", () => {
    const illuminanceSpy = sinon.spy();
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
    });
    const characteristic = this.characteristics.CurrentAmbientLightLevel;
    assert.strictEqual(accessory.lastUpdatedAt, undefined);
    accessory.setIlluminance(5000);
    assert.notStrictEqual(accessory.lastUpdatedAt, undefined);
    sinon.useFakeTimers(Date.now() + 1000 * 60 * accessory.timeout);
    characteristic.emit("get", illuminanceSpy);
    assert(illuminanceSpy.calledWith(sinon.match.instanceOf(Error)));
  });

  it("should return all services for Hygrothermograph", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    const services = accessory.getServices();
    assert.strictEqual(services.length, 4);
  });

  it("should return all services for MiFlora", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
    });
    const services = accessory.getServices();
    assert.strictEqual(services.length, 6);
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
    sinon.useFakeTimers(Date.now() + 1000 * 60 * (accessory.timeout + 15));
    assert(accessory.hasTimedOut());
  });

  it("should return timed out false when not timed out", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    accessory.lastUpdatedAt = Date.now();
    sinon.useFakeTimers(Date.now() + 1000 * 60 * (accessory.timeout - 5));
    assert(!accessory.hasTimedOut());
  });

  it("should return timed out false when set as 0", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      timeout: 0,
    });
    accessory.lastUpdatedAt = Date.now();
    sinon.useFakeTimers(Date.now() + 1000 * 60 * (accessory.timeout + 15));
    assert(!accessory.hasTimedOut());
  });

  it("should return timed out false with undefined timestamp", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    sinon.useFakeTimers(Date.now() + 1000 * 60 * (accessory.timeout + 15));
    assert(!accessory.hasTimedOut());
  });

  it("should have custom temperature name when configured", () => {
    const temperatureName = "CustomTemperatureName";
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      temperatureName,
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
      humidityName,
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
      address,
    });
    assert.strictEqual(accessory.serialNumber, "deadbeef");
  });

  it("should have undefined serial number of no configured address", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    assert.strictEqual(accessory.serialNumber, undefined);
  });

  it("should setup fakeGatoHistoryService when configured", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      fakeGatoEnabled: true,
    });
    assert(accessory.fakeGatoHistoryService !== undefined);
    assert.strictEqual(accessory.fakeGatoHistoryService.accessoryType, "room");
    assert.strictEqual(accessory.fakeGatoHistoryService.accessory, accessory);
    assert.strictEqual(
      accessory.fakeGatoHistoryService.optionalParams.path,
      "/tmp/"
    );
    assert.strictEqual(
      accessory.fakeGatoHistoryService.optionalParams.storage,
      "fs"
    );
    assert.strictEqual(
      accessory.fakeGatoHistoryService.optionalParams.filename,
      "fakegato-history_HygrothermographAccessory.json"
    );
  });

  it("should setup fakeGatoHistoryService when configured with options", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      fakeGatoEnabled: true,
      fakeGatoOptions: { disableRepeatLastData: true },
    });
    assert(accessory.fakeGatoHistoryService !== undefined);
    assert.strictEqual(
      accessory.fakeGatoHistoryService.optionalParams.disableRepeatLastData,
      true
    );
  });

  it("should not setup fakeGatoHistoryService when not configured", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      fakeGatoEnabled: false,
    });
    assert.strictEqual(accessory.fakeGatoHistoryService, undefined);
  });

  it("should add fakegato to getServices when configured", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      fakeGatoEnabled: true,
    });
    const services = accessory.getServices();
    assert.strictEqual(services.length, 5);
  });

  it("should use custom fakegato storage path when configured", () => {
    const path = "/home/bridge/";
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      fakeGatoEnabled: true,
      fakeGatoStoragePath: path,
    });
    assert.strictEqual(accessory.fakeGatoStoragePath, path);
  });

  it("should use homebridge storage path for fakegato storage when not configured", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      fakeGatoEnabled: true,
    });
    assert.strictEqual(
      accessory.fakeGatoStoragePath,
      this.homebridgeMock.user.storagePath()
    );
  });

  it("should add temperature fakegato entry", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      fakeGatoEnabled: true,
    });
    const spy = sinon.spy(accessory.fakeGatoHistoryService, "addEntry");
    accessory.latestHumidity = 34.0;
    accessory.setTemperature(28.0);
    assert(spy.called);
    assert.strictEqual(spy.args[0][0].temp, 28.0);
    assert.strictEqual(spy.args[0][0].humidity, 34.0);
  });

  it("should add humidity fakegato entry", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      fakeGatoEnabled: true,
    });
    const spy = sinon.spy(accessory.fakeGatoHistoryService, "addEntry");
    accessory.latestTemperature = 28.0;
    accessory.setHumidity(34.0);
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
        temperatureTopic: topic,
      },
    });
    assert(accessory.mqttClient != null);
    const publishSpy = sinon.spy(accessory.mqttClient, "publish");
    accessory.setTemperature(value);
    accessory.setBatteryLevel(10);
    assert(publishSpy.calledOnce);
    assert.strictEqual(publishSpy.args[0][0], topic);
    assert.strictEqual(publishSpy.args[0][1], String(value));
  });

  it("should publish temperature to mqtt", () => {
    const topic = "sensors/temperature";
    const value = 19.0;
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
      mqtt: {
        url: "mqtt://127.0.0.1",
        temperatureTopic: topic,
      },
    });
    assert(accessory.mqttClient != null);
    const publishSpy = sinon.spy(accessory.mqttClient, "publish");
    accessory.setTemperature(value);
    accessory.setBatteryLevel(10);
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
        humidityTopic: topic,
      },
    });
    assert(accessory.mqttClient != null);
    const publishSpy = sinon.spy(accessory.mqttClient, "publish");
    accessory.setHumidity(value);
    accessory.setTemperature(23);
    assert(publishSpy.calledOnce);
    assert.strictEqual(publishSpy.args[0][0], topic);
    assert.strictEqual(publishSpy.args[0][1], String(value));
  });

  it("should publish moisture to mqtt on MiFlora", () => {
    const topic = "sensors/moisture";
    const value = 25.5;
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
      mqtt: {
        url: "mqtt://127.0.0.1",
        moistureTopic: topic,
      },
    });
    assert(accessory.mqttClient != null);
    const publishSpy = sinon.spy(accessory.mqttClient, "publish");
    accessory.setMoisture(value);
    accessory.setTemperature(23);
    assert(publishSpy.calledOnce);
    assert.strictEqual(publishSpy.args[0][0], topic);
    assert.strictEqual(publishSpy.args[0][1], String(value));
  });

  it("should publish fertility to mqtt on MiFlora", () => {
    const topic = "sensors/fertility";
    const value = 500;
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
      mqtt: {
        url: "mqtt://127.0.0.1",
        fertilityTopic: topic,
      },
    });
    assert(accessory.mqttClient != null);
    const publishSpy = sinon.spy(accessory.mqttClient, "publish");
    accessory.setFertility(value);
    accessory.setTemperature(23);
    assert(publishSpy.calledOnce);
    assert.strictEqual(publishSpy.args[0][0], topic);
    assert.strictEqual(publishSpy.args[0][1], String(value));
  });

  it("should publish illuminance to mqtt on MiFlora", () => {
    const topic = "sensors/illuminance";
    const value = 2500;
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
      mqtt: {
        url: "mqtt://127.0.0.1",
        illuminanceTopic: topic,
      },
    });
    assert(accessory.mqttClient != null);
    const publishSpy = sinon.spy(accessory.mqttClient, "publish");
    accessory.setIlluminance(value);
    accessory.setTemperature(23);
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
        batteryTopic: topic,
      },
    });
    assert(accessory.mqttClient != null);
    const publishSpy = sinon.spy(accessory.mqttClient, "publish");
    accessory.setBatteryLevel(value);
    accessory.setTemperature(23);
    assert(publishSpy.calledOnce);
    assert.strictEqual(publishSpy.args[0][0], topic);
    assert.strictEqual(publishSpy.args[0][1], String(value));
  });

  it("should not configure mqtt client when not configured", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    assert(accessory.mqttClient == null);
  });

  it("should log on mqtt events", () => {
    const spyErrorLogger = sinon.spy(mockLogger, "error");
    const spyInfoLogger = sinon.spy(mockLogger, "info");
    const spyDebugLogger = sinon.spy(mockLogger, "debug");
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      mqtt: {
        url: "mqtt://127.0.0.1",
        batteryTopic: "battery/",
      },
    });
    assert.strictEqual(spyDebugLogger.callCount, 1);
    accessory.mqttClient.emit("error", new Error("error"));
    assert(spyErrorLogger.calledOnce);
    accessory.mqttClient.emit("connect");
    assert(spyInfoLogger.calledOnce);
    accessory.mqttClient.emit("close");
    assert.strictEqual(spyDebugLogger.callCount, 2);
    accessory.mqttClient.emit("reconnect");
    assert.strictEqual(spyDebugLogger.callCount, 3);
  });

  it("should set forceDiscovering to true when not set", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    assert.strictEqual(accessory.scanner.forceDiscovering, true);
  });

  it("should pass forceDiscovering to scanner", () => {
    const accessoryForcedDiscovery = new this.HygrothermographAccessory(
      mockLogger,
      {
        forceDiscovering: true,
      }
    );
    assert.strictEqual(accessoryForcedDiscovery.scanner.forceDiscovering, true);

    const accessoryNotForcedDiscovery = new this.HygrothermographAccessory(
      mockLogger,
      {
        forceDiscovering: false,
      }
    );
    assert.strictEqual(
      accessoryNotForcedDiscovery.scanner.forceDiscovering,
      false
    );
  });

  it("should set scanner.restartDelay to default when not set", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    assert.strictEqual(accessory.scanner.restartDelay, 2500);
  });

  it("should set scanner.restartDelay when forceDiscoveringDelay is configured", () => {
    const forceDiscoveringDelay = 2500;
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      forceDiscoveringDelay,
    });
    assert.strictEqual(accessory.scanner.restartDelay, forceDiscoveringDelay);
  });

  it("should batch update on change when configured with updateInterval", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger);
    accessory.scanner.emit("temperatureChange", 25.5, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("humidityChange", 35.5, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("batteryChange", 99, {
      address: "123",
      id: "123",
    });
    const updateTemperatureValueSpy = sinon.spy(
      this.characteristics.CurrentTemperature,
      "updateValue"
    );
    const updateHumidityValueSpy = sinon.spy(
      this.characteristics.CurrentRelativeHumidity,
      "updateValue"
    );
    const updateBatteryValueSpy = sinon.spy(
      this.characteristics.BatteryLevel,
      "updateValue"
    );

    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });
    assert(updateTemperatureValueSpy.called === false);
    assert(updateHumidityValueSpy.called === false);
    assert(updateBatteryValueSpy.called === false);
  });

  it("should batch update on change when configured with updateInterval on MiFlora", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      type: this.AccessoryType.MiFlora,
    });
    accessory.scanner.emit("temperatureChange", 25.5, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("moistureChange", 35.5, {
      address: "123",
      id: "123",
    });
    // accessory.scanner.emit("fertilityChange", 500, {
    //   address: "123",
    //   id: "123",
    // });
    accessory.scanner.emit("illuminanceChange", 400, {
      address: "123",
      id: "123",
    });
    const updateTemperatureValueSpy = sinon.spy(
      this.characteristics.CurrentTemperature,
      "updateValue"
    );
    const updateMoistureValueSpy = sinon.spy(
      this.characteristics.CurrentRelativeHumidity,
      "updateValue"
    );
    // const updateFertilityValueSpy = sinon.spy(
    //   this.characteristics.CurrentAmbientLightLevel,
    //   "updateValue"
    // );
    const updateIlluminanceValueSpy = sinon.spy(
      this.characteristics.CurrentAmbientLightLevel,
      "updateValue"
    );

    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });
    assert(updateTemperatureValueSpy.called === false);
    assert(updateMoistureValueSpy.called === false);
    // assert(updateFertilityValueSpy.called === false);
    assert(updateIlluminanceValueSpy.called === false);
  });

  it("should not batch update on change when configured with updateInterval", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      updateInterval: 60,
    });
    const updateTemperatureValueSpy = sinon.spy(
      this.characteristics.CurrentTemperature,
      "updateValue"
    );
    const updateHumidityValueSpy = sinon.spy(
      this.characteristics.CurrentRelativeHumidity,
      "updateValue"
    );
    const updateBatteryValueSpy = sinon.spy(
      this.characteristics.BatteryLevel,
      "updateValue"
    );
    accessory.scanner.emit("temperatureChange", 25.5, {
      address: "123",
      id: "123",
    });
    assert(updateTemperatureValueSpy.called === false);
    accessory.scanner.emit("humidityChange", 35.5, {
      address: "123",
      id: "123",
    });
    assert(updateHumidityValueSpy.called === false);
    accessory.scanner.emit("batteryChange", 99, {
      address: "123",
      id: "123",
    });
    assert(updateBatteryValueSpy.called === false);
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });
    assert(updateTemperatureValueSpy.called);
    assert(updateHumidityValueSpy.called);
    assert(updateBatteryValueSpy.called);
  });

  it("should not batch update on change when configured with updateInterval on MiFlora", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      updateInterval: 60,
      type: this.AccessoryType.MiFlora,
    });
    const updateTemperatureValueSpy = sinon.spy(
      this.characteristics.CurrentTemperature,
      "updateValue"
    );
    const updateMoistureValueSpy = sinon.spy(
      this.characteristics.CurrentRelativeHumidity,
      "updateValue"
    );
    // const updateFertilityValueSpy = sinon.spy(
    //   this.characteristics.CurrentAmbientLightLevel,
    //   "updateValue"
    // );
    const updateIlluminanceValueSpy = sinon.spy(
      this.characteristics.CurrentAmbientLightLevel,
      "updateValue"
    );
    accessory.scanner.emit("temperatureChange", 25.5, {
      address: "123",
      id: "123",
    });
    assert(updateTemperatureValueSpy.called === false);
    accessory.scanner.emit("moistureChange", 35.5, {
      address: "123",
      id: "123",
    });
    assert(updateMoistureValueSpy.called === false);
    // accessory.scanner.emit("fertilityChange", 500, {
    //   address: "123",
    //   id: "123",
    // });
    // assert(updateFertilityValueSpy.called === false);
    accessory.scanner.emit("illuminanceChange", 400, {
      address: "123",
      id: "123",
    });
    assert(updateIlluminanceValueSpy.called === false);
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });
    assert(updateTemperatureValueSpy.called);
    assert(updateMoistureValueSpy.called);
    // assert(updateFertilityValueSpy.called);
    assert(updateIlluminanceValueSpy.called);
  });

  it("should batch update with missing values", () => {
    const updateInterval = 60;
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      updateInterval: updateInterval,
    });
    const updateTemperatureValueSpy = sinon.spy(
      this.characteristics.CurrentTemperature,
      "updateValue"
    );
    const updateHumidityValueSpy = sinon.spy(
      this.characteristics.CurrentRelativeHumidity,
      "updateValue"
    );
    const updateBatteryValueSpy = sinon.spy(
      this.characteristics.BatteryLevel,
      "updateValue"
    );
    accessory.lastBatchUpdatedAt = Date.now();
    accessory.scanner.emit("temperatureChange", 25.5, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });
    assert(updateTemperatureValueSpy.called === false);
    assert(updateHumidityValueSpy.called === false);
    assert(updateBatteryValueSpy.called === false);

    sinon.useFakeTimers(Date.now() + 1000 * updateInterval);
    accessory.scanner.emit("temperatureChange", 26.5, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });
    assert(updateTemperatureValueSpy.called);
    assert(updateHumidityValueSpy.called === false);
    assert(updateBatteryValueSpy.called === false);

    sinon.useFakeTimers(Date.now() + 1000 * updateInterval);

    accessory.scanner.emit("humidityChange", 35.5, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });
    assert(updateTemperatureValueSpy.called);
    assert(updateHumidityValueSpy.called);
    assert(updateBatteryValueSpy.called === false);

    sinon.useFakeTimers(Date.now() + 1000 * updateInterval);
    accessory.scanner.emit("batteryChange", 99, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });

    assert(updateTemperatureValueSpy.called);
    assert(updateHumidityValueSpy.called);
    assert(updateBatteryValueSpy.called);

    // Reset temperature
    accessory.latestTemperature = null;
    updateTemperatureValueSpy.resetHistory();
    sinon.useFakeTimers(Date.now() + 1000 * updateInterval);
    accessory.scanner.emit("batteryChange", 99, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });

    assert(updateTemperatureValueSpy.called === false);
    assert(updateHumidityValueSpy.called);
    assert(updateBatteryValueSpy.called);
  });

  it("should batch update with missing values on MiFlora [1]", () => {
    const updateInterval = 60;
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      updateInterval: updateInterval,
      type: this.AccessoryType.MiFlora,
    });
    const updateTemperatureValueSpy = sinon.spy(
      this.characteristics.CurrentTemperature,
      "updateValue"
    );
    const updateMoistureValueSpy = sinon.spy(
      this.characteristics.CurrentRelativeHumidity,
      "updateValue"
    );
    const updateIlluminanceValueSpy = sinon.spy(
      this.characteristics.CurrentAmbientLightLevel,
      "updateValue"
    );
    accessory.lastBatchUpdatedAt = Date.now();
    accessory.scanner.emit("temperatureChange", 25.5, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });
    assert(updateTemperatureValueSpy.called === false);
    assert(updateMoistureValueSpy.called === false);
    assert(updateIlluminanceValueSpy.called === false);

    sinon.useFakeTimers(Date.now() + 1000 * updateInterval);
    accessory.scanner.emit("temperatureChange", 26.5, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });
    assert(updateTemperatureValueSpy.called);
    assert(updateMoistureValueSpy.called === false);
    assert(updateIlluminanceValueSpy.called === false);

    sinon.useFakeTimers(Date.now() + 1000 * updateInterval);

    accessory.scanner.emit("moistureChange", 35.5, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });
    assert(updateTemperatureValueSpy.called);
    assert(updateMoistureValueSpy.called);
    assert(updateIlluminanceValueSpy.called === false);

    sinon.useFakeTimers(Date.now() + 1000 * updateInterval);
    accessory.scanner.emit("illuminanceChange", 99, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });

    assert(updateTemperatureValueSpy.called);
    assert(updateMoistureValueSpy.called);
    assert(updateIlluminanceValueSpy.called);

    // Reset temperature
    accessory.latestTemperature = null;
    updateTemperatureValueSpy.resetHistory();
    sinon.useFakeTimers(Date.now() + 1000 * updateInterval);
    accessory.scanner.emit("illuminanceChange", 99, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });

    assert(updateTemperatureValueSpy.called === false);
    assert(updateMoistureValueSpy.called);
    assert(updateIlluminanceValueSpy.called);
  });

  it("should batch update with missing values on MiFlora", () => {
    const updateInterval = 60;
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      updateInterval: updateInterval,
      type: this.AccessoryType.MiFlora,
    });
    const updateTemperatureValueSpy = sinon.spy(
      this.characteristics.CurrentTemperature,
      "updateValue"
    );
    const updateMoistureValueSpy = sinon.spy(
      this.characteristics.CurrentRelativeHumidity,
      "updateValue"
    );
    const updateFertilityValueSpy = sinon.spy(
      this.characteristics.CurrentAmbientLightLevel,
      "updateValue"
    );
    accessory.lastBatchUpdatedAt = Date.now();
    accessory.scanner.emit("temperatureChange", 25.5, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });
    assert(updateTemperatureValueSpy.called === false);
    assert(updateMoistureValueSpy.called === false);
    assert(updateFertilityValueSpy.called === false);

    sinon.useFakeTimers(Date.now() + 1000 * updateInterval);
    accessory.scanner.emit("temperatureChange", 26.5, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });
    assert(updateTemperatureValueSpy.called);
    assert(updateMoistureValueSpy.called === false);
    assert(updateFertilityValueSpy.called === false);

    sinon.useFakeTimers(Date.now() + 1000 * updateInterval);

    accessory.scanner.emit("moistureChange", 35.5, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });
    assert(updateTemperatureValueSpy.called);
    assert(updateMoistureValueSpy.called);
    assert(updateFertilityValueSpy.called === false);

    sinon.useFakeTimers(Date.now() + 1000 * updateInterval);
    accessory.scanner.emit("fertilityChange", 99, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });

    assert(updateTemperatureValueSpy.called);
    assert(updateMoistureValueSpy.called);
    assert(updateFertilityValueSpy.called);

    // Reset temperature
    accessory.latestTemperature = null;
    updateTemperatureValueSpy.resetHistory();
    sinon.useFakeTimers(Date.now() + 1000 * updateInterval);
    accessory.scanner.emit("fertilityChange", 99, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });

    assert(updateTemperatureValueSpy.called === false);
    assert(updateMoistureValueSpy.called);
    assert(updateFertilityValueSpy.called);
  });

  it("should not batch update until interval delta is reached", () => {
    const updateInterval = 60;
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      updateInterval: updateInterval,
    });

    accessory.scanner.emit("temperatureChange", 25.5, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("humidityChange", 35.5, {
      address: "123",
      id: "123",
    });
    accessory.scanner.emit("batteryChange", 99, {
      address: "123",
      id: "123",
    });
    const updateTemperatureValueSpy = sinon.spy(
      this.characteristics.CurrentTemperature,
      "updateValue"
    );
    const updateHumidityValueSpy = sinon.spy(
      this.characteristics.CurrentRelativeHumidity,
      "updateValue"
    );
    const updateBatteryValueSpy = sinon.spy(
      this.characteristics.BatteryLevel,
      "updateValue"
    );
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });
    assert(updateTemperatureValueSpy.called);
    assert(updateHumidityValueSpy.called);
    assert(updateBatteryValueSpy.called);

    updateTemperatureValueSpy.resetHistory();
    updateHumidityValueSpy.resetHistory();
    updateBatteryValueSpy.resetHistory();
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });
    assert(updateTemperatureValueSpy.called === false);
    assert(updateHumidityValueSpy.called === false);
    assert(updateBatteryValueSpy.called === false);

    sinon.useFakeTimers(Date.now() + 1000 * (updateInterval - 5));
    updateTemperatureValueSpy.resetHistory();
    updateHumidityValueSpy.resetHistory();
    updateBatteryValueSpy.resetHistory();
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });
    assert(updateTemperatureValueSpy.called === false);
    assert(updateHumidityValueSpy.called === false);
    assert(updateBatteryValueSpy.called === false);

    sinon.useFakeTimers(Date.now() + 1000 * (updateInterval + 5));
    updateTemperatureValueSpy.resetHistory();
    updateHumidityValueSpy.resetHistory();
    updateBatteryValueSpy.resetHistory();
    accessory.scanner.emit("change", {
      address: "123",
      id: "123",
    });
    assert(updateTemperatureValueSpy.called);
    assert(updateHumidityValueSpy.called);
    assert(updateBatteryValueSpy.called);
  });

  it("should not setup batteryService when disabled", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      disableBatteryLevel: true,
    });
    assert.strictEqual(accessory.batteryService, undefined);
  });

  it("should not try and update batteryService when disabled", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      disableBatteryLevel: true,
    });
    const characteristic = this.characteristics.BatteryLevel;
    const updateValueSpy = sinon.spy(characteristic, "updateValue");
    accessory.scanner.emit("batteryChange", 90, { address: "123", id: "123" });
    assert(updateValueSpy.notCalled);
  });

  it("should setup batteryService when enabled", () => {
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      disableBatteryLevel: false,
    });
    assert(accessory.batteryService !== undefined);
  });

  it("should apply positive temperatureOffset", () => {
    const positiveOffset = 2;
    const temperatureValue = 23;
    const positiveTemperatureSpy = sinon.spy();
    const accessoryWithPositiveOffset = new this.HygrothermographAccessory(
      mockLogger,
      {
        temperatureOffset: 2,
      }
    );
    const characteristic = this.characteristics.CurrentTemperature;
    accessoryWithPositiveOffset.setTemperature(temperatureValue);
    characteristic.emit("get", positiveTemperatureSpy);
    assert(
      positiveTemperatureSpy.calledWith(null, temperatureValue + positiveOffset)
    );
  });

  it("should apply negative temperatureOffset", () => {
    const negativeOffset = -2;
    const temperatureValue = 23;
    const negativeTemperatureSpy = sinon.spy();
    const accessoryWithNegativeOffset = new this.HygrothermographAccessory(
      mockLogger,
      {
        temperatureOffset: 2,
      }
    );
    const characteristic = this.characteristics.CurrentTemperature;
    accessoryWithNegativeOffset.setTemperature(temperatureValue);
    characteristic.emit("get", negativeTemperatureSpy);
    assert(
      negativeTemperatureSpy.calledWith(null, temperatureValue - negativeOffset)
    );
  });

  it("should apply positive humidityOffset", () => {
    const positiveOffset = 2;
    const humidityValue = 23;
    const positiveHumiditySpy = sinon.spy();
    const accessoryWithPositiveOffset = new this.HygrothermographAccessory(
      mockLogger,
      {
        humidityOffset: 2,
      }
    );
    const characteristic = this.characteristics.CurrentRelativeHumidity;
    accessoryWithPositiveOffset.setHumidity(humidityValue);
    characteristic.emit("get", positiveHumiditySpy);
    assert(
      positiveHumiditySpy.calledWith(null, humidityValue + positiveOffset)
    );
  });

  it("should apply negative humidityOffset", () => {
    const negativeOffset = -2;
    const humidityValue = 23;
    const negativeHumiditySpy = sinon.spy();
    const accessoryWithNegativeOffset = new this.HygrothermographAccessory(
      mockLogger,
      {
        humidityOffset: 2,
      }
    );
    const characteristic = this.characteristics.CurrentRelativeHumidity;
    accessoryWithNegativeOffset.setHumidity(humidityValue);
    characteristic.emit("get", negativeHumiditySpy);
    assert(
      negativeHumiditySpy.calledWith(null, humidityValue - negativeOffset)
    );
  });

  it("should warn on missing address", () => {
    const spyLogger = sinon.spy(mockLogger, "warn");
    const accessory = new this.HygrothermographAccessory(mockLogger, {});
    assert(spyLogger.called);
  });

  it("should not warn on missing address when defined", () => {
    const spyLogger = sinon.spy(mockLogger, "warn");
    const accessory = new this.HygrothermographAccessory(mockLogger, {
      address: "123",
    });
    assert(spyLogger.notCalled);
  });

  it("should throw on unknown accessory type when setting up a scanner", () => {
    assert.throws(() => {
      accessory = new this.HygrothermographAccessory(mockLogger, {});
      // Hacking accessory with another type
      accessory.type = "foo-bar";

      // calling setupScanner again
      accessory.scanner = accessory.setupScanner();
    }, /setupScanner not implemented for Accessory "foo-bar"/);
  });

  it("should throw on unknown accessory type when calling getInformationService", () => {
    assert.throws(() => {
      accessory = new this.HygrothermographAccessory(mockLogger, {});
      // Hacking accessory with another type
      accessory.type = "foo-bar";

      // calling getInformationService again
      accessory.informationService = accessory.getInformationService();
    }, /getInformationService not implemented for Accessory "foo-bar"/);
  });

  it("should throw on unknown accessory type when calling getServices", () => {
    assert.throws(() => {
      accessory = new this.HygrothermographAccessory(mockLogger, {});
      // Hacking accessory with another type
      accessory.type = "foo-bar";
      accessory.getServices();
    }, /getServices not implemented for Accessory "foo-bar"/);
  });

  it("should throw on unknown accessory type when calling setupMQTTClient", () => {
    assert.throws(() => {
      const topic = "sensors/temperature";
      accessory = new this.HygrothermographAccessory(mockLogger, {
        mqtt: {
          url: "mqtt://127.0.0.1",
          temperatureTopic: topic,
        },
      });
      // Hacking accessory with another type
      accessory.type = "foo-bar";
      accessory.mqttClient = accessory.setupMQTTClient();
    }, /setupMQTTClient not implemented for Accessory "foo-bar"/);
  });

  it("should throw on unknown accessory type when calling scanner.on change", () => {
    assert.throws(() => {
      const updateInterval = 60;
      const accessory = new this.HygrothermographAccessory(mockLogger, {
        updateInterval: updateInterval,
      });
      // Hacking accessory with another type
      accessory.type = "foo-bar";

      accessory.lastBatchUpdatedAt = Date.now();
      accessory.scanner.emit("temperatureChange", 25.5, {
        address: "123",
        id: "123",
      });
      accessory.scanner.emit("change", {
        address: "123",
        id: "123",
      });

      sinon.useFakeTimers(Date.now() + 1000 * updateInterval);
      accessory.scanner.emit("temperatureChange", 26.5, {
        address: "123",
        id: "123",
      });
      accessory.scanner.emit("change", {
        address: "123",
        id: "123",
      });

      accessory.lastBatchUpdatedAt = Date.now();
      accessory.scanner.emit("temperatureChange", 25.5, {
        address: "123",
        id: "123",
      });
      accessory.scanner.emit("change", {
        address: "123",
        id: "123",
      });
    }, /scanner.on\("change" not implemented for Accessory "foo-bar"/);
  });
});
