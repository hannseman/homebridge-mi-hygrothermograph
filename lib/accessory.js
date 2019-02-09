const mqtt = require("mqtt");
const { Scanner } = require("./scanner");
const { version } = require("../package.json");

let Service;
let Characteristic;
let FakeGatoHistoryService;
let homebridgeAPI;

const defaultTimeout = 15;

class HygrothermographAccessory {
  constructor(log, config) {
    this.log = log;
    this.config = config || {};
    this.displayName = this.config.name;

    this.latestTemperature = undefined;
    this.latestHumidity = undefined;
    this.latestBatteryLevel = undefined;
    this.lastUpdatedAt = undefined;
    this.lastBatchUpdatedAt = undefined;

    this.informationService = this.getInformationService();
    this.temperatureService = this.getTemperatureService();
    this.humidityService = this.getHumidityService();
    this.batteryService = this.getBatteryService();
    this.fakeGatoHistoryService = this.getFakeGatoHistoryService();

    this.temperatureMQTTTopic = undefined;
    this.humidityMQTTTopic = undefined;
    this.batteryMQTTTopic = undefined;
    this.mqttClient = this.setupMQTTClient();

    this.scanner = this.setupScanner();

    this.log.debug("Initialized accessory");
  }

  setTemperature(newValue, force = false) {
    this.latestTemperature = newValue;
    this.lastUpdatedAt = Date.now();
    if (this.useBatchUpdating && force === false) {
      return;
    }
    this.temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(newValue);
    this.addFakeGatoHistoryEntry();
    this.publishValueToMQTT(this.temperatureMQTTTopic, this.latestTemperature);
  }

  get temperature() {
    if (this.hasTimedOut()) {
      return undefined;
    }
    return this.latestTemperature;
  }

  setHumidity(newValue, force = false) {
    this.latestHumidity = newValue;
    this.lastUpdatedAt = Date.now();
    if (this.useBatchUpdating && force === false) {
      return;
    }
    this.humidityService
      .getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .updateValue(newValue);
    this.addFakeGatoHistoryEntry();
    this.publishValueToMQTT(this.humidityMQTTTopic, this.latestHumidity);
  }

  get humidity() {
    if (this.hasTimedOut()) {
      return undefined;
    }
    return this.latestHumidity;
  }

  setBatteryLevel(newValue, force = false) {
    this.latestBatteryLevel = newValue;
    this.lastUpdatedAt = Date.now();
    if (this.useBatchUpdating && force === false) {
      return;
    }
    this.batteryService
      .getCharacteristic(Characteristic.BatteryLevel)
      .updateValue(newValue);
    this.publishValueToMQTT(this.batteryMQTTTopic, this.latestBatteryLevel);
  }

  get batteryLevel() {
    if (this.hasTimedOut()) {
      return undefined;
    }
    return this.latestBatteryLevel;
  }

  get batteryStatus() {
    let batteryStatus;
    if (this.batteryLevel == null) {
      batteryStatus = undefined;
    } else if (this.batteryLevel > this.batteryLevelThreshold) {
      batteryStatus = Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    } else {
      batteryStatus = Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
    }
    return batteryStatus;
  }

  get batteryLevelThreshold() {
    return this.config.lowBattery || 10;
  }

  get temperatureName() {
    return this.config.temperatureName || "Temperature";
  }

  get humidityName() {
    return this.config.humidityName || "Humidity";
  }

  get serialNumber() {
    return this.config.address != null
      ? this.config.address.replace(/:/g, "")
      : undefined;
  }

  get lastUpdatedISO8601() {
    return new Date(this.lastUpdatedAt).toISOString();
  }

  get fakeGatoStoragePath() {
    return this.config.fakeGatoStoragePath || homebridgeAPI.user.storagePath();
  }

  get timeout() {
    return this.config.timeout == null ? defaultTimeout : this.config.timeout;
  }

  get isFakeGatoEnabled() {
    return this.config.fakeGatoEnabled || false;
  }

  get useBatchUpdating() {
    return this.config.updateInterval != null;
  }

  isReadyForBatchUpdate() {
    if (this.useBatchUpdating === false) {
      return false;
    }
    if (this.lastBatchUpdatedAt == null) {
      return true;
    }
    const timeoutMilliseconds = 1000 * this.config.updateInterval;
    return this.lastBatchUpdatedAt + timeoutMilliseconds <= Date.now();
  }

  setupScanner() {
    const scanner = new Scanner(this.config.address, {
      log: this.log,
      forceDiscovering: this.config.forceDiscovering !== false,
      restartDelay: this.config.forceDiscoveringDelay
    });
    scanner.on("temperatureChange", (temperature, peripheral) => {
      const { address } = peripheral;
      this.log.debug(`[${address}] Temperature: ${temperature}C`);
      this.setTemperature(temperature);
    });
    scanner.on("humidityChange", (humidity, peripheral) => {
      const { address } = peripheral;
      this.log.debug(`[${address}] Humidity: ${humidity}%`);
      this.setHumidity(humidity);
    });
    scanner.on("batteryChange", (batteryLevel, peripheral) => {
      const { address } = peripheral;
      this.log.debug(`[${address}] Battery level: ${batteryLevel}%`);
      this.setBatteryLevel(batteryLevel);
    });
    scanner.on("change", () => {
      if (this.isReadyForBatchUpdate() === false) {
        return;
      }
      this.log.debug("Batch updating values");
      this.lastBatchUpdatedAt = Date.now();
      this.setTemperature(this.batteryLevel, true);
      this.setHumidity(this.batteryLevel, true);
      this.setBatteryLevel(this.batteryLevel, true);
    });
    scanner.on("error", error => {
      this.log.error(error);
    });

    return scanner;
  }

  hasTimedOut() {
    if (this.timeout === 0) {
      return false;
    }
    if (this.lastUpdatedAt == null) {
      return false;
    }
    const timeoutMilliseconds = 1000 * 60 * this.timeout;
    const timedOut = this.lastUpdatedAt <= Date.now() - timeoutMilliseconds;
    if (timedOut) {
      this.log.warn(
        `[${this.config.address}] Timed out, last update: ${
          this.lastUpdatedISO8601
        }`
      );
    }
    return timedOut;
  }

  addFakeGatoHistoryEntry() {
    if (
      !this.isFakeGatoEnabled ||
      (this.temperature == null || this.humidity == null)
    ) {
      return;
    }
    this.fakeGatoHistoryService.addEntry({
      time: new Date().getTime() / 1000,
      temp: this.temperature,
      humidity: this.humidity
    });
  }

  setupMQTTClient() {
    const config = this.config.mqtt;
    if (config == null || config.url == null) {
      return;
    }
    const {
      temperatureTopic,
      humidityTopic,
      batteryTopic,
      url,
      ...mqttOptions
    } = config;

    this.temperatureMQTTTopic = temperatureTopic;
    this.humidityMQTTTopic = humidityTopic;
    this.batteryMQTTTopic = batteryTopic;

    const client = mqtt.connect(url, mqttOptions);
    client.on("connect", () => {
      this.log.info("MQTT Client connected.");
    });
    client.on("reconnect", () => {
      this.log.debug("MQTT Client reconnecting.");
    });
    client.on("close", () => {
      this.log.debug("MQTT Client disconnected");
    });
    client.on("error", error => {
      this.log.error(error);
      client.end();
    });
    return client;
  }

  publishValueToMQTT(topic, value) {
    if (
      this.mqttClient == null ||
      this.mqttClient.connected === false ||
      topic == null ||
      value == null
    ) {
      return;
    }
    this.mqttClient.publish(topic, String(value), {
      qos: this.config.mqtt.qos || 0
    });
  }

  getFakeGatoHistoryService() {
    if (!this.isFakeGatoEnabled) {
      return undefined;
    }
    const serialNumber = this.serialNumber || this.constructor.name;
    const filename = `fakegato-history_${serialNumber}.json`;
    const path = this.fakeGatoStoragePath;
    return new FakeGatoHistoryService("room", this, {
      filename,
      path,
      storage: "fs"
    });
  }

  getInformationService() {
    const accessoryInformation = new Service.AccessoryInformation()
      .setCharacteristic(Characteristic.Manufacturer, "Cleargrass Inc")
      .setCharacteristic(Characteristic.Model, "LYWSDCGQ01ZM")
      .setCharacteristic(Characteristic.FirmwareRevision, version);
    if (this.serialNumber != null) {
      accessoryInformation.setCharacteristic(
        Characteristic.SerialNumber,
        this.serialNumber
      );
    }
    return accessoryInformation;
  }

  onCharacteristicGetValue(field, callback) {
    const value = this[field];
    if (value == null) {
      callback(new Error(`Undefined characteristic value for ${field}`));
    } else {
      callback(null, value);
    }
  }

  getTemperatureService() {
    const temperatureService = new Service.TemperatureSensor(
      this.temperatureName
    );
    temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on("get", this.onCharacteristicGetValue.bind(this, "temperature"));
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
      .on("get", this.onCharacteristicGetValue.bind(this, "humidity"));
    return humidityService;
  }

  getBatteryService() {
    const batteryService = new Service.BatteryService("Battery");
    batteryService
      .getCharacteristic(Characteristic.BatteryLevel)
      .on("get", this.onCharacteristicGetValue.bind(this, "batteryLevel"));
    batteryService.setCharacteristic(
      Characteristic.ChargingState,
      Characteristic.ChargingState.NOT_CHARGEABLE
    );
    batteryService
      .getCharacteristic(Characteristic.StatusLowBattery)
      .on("get", this.onCharacteristicGetValue.bind(this, "batteryStatus"));
    return batteryService;
  }

  getServices() {
    const services = [
      this.informationService,
      this.temperatureService,
      this.humidityService,
      this.batteryService,
      this.fakeGatoHistoryService
    ];
    return services.filter(Boolean);
  }
}

module.exports = homebridge => {
  FakeGatoHistoryService = require("fakegato-history")(homebridge);
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridgeAPI = homebridge;
  return { HygrothermographAccessory };
};
