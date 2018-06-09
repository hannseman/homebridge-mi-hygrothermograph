const { Scanner } = require("./scanner");
const { version } = require("../package.json");
const mqtt = require("mqtt");

let Service;
let Characteristic;
let FakeGatoHistoryService;
let homebridgeAPI;

const defaultTimeout = 15;

class HygrothermographAccessory {
  constructor(log, config) {
    this.log = log;
    this.config = config;
    this.displayName = config.name;

    this.latestTemperature = undefined;
    this.latestHumidity = undefined;
    this.latestBatteryLevel = undefined;

    this.lastUpdatedAt = undefined;
    this.timeout = config.timeout == null ? defaultTimeout : config.timeout;
    this.fakeGatoEnabled = config.fakeGatoEnabled || false;

    this.informationService = this.getInformationService();
    this.temperatureService = this.getTemperatureService();
    this.humidityService = this.getHumidityService();
    this.batteryService = this.getBatteryService();
    this.fakeGatoHistoryService = this.getFakeGatoHistoryService();

    this.mqttClient = this.configureMQTTClient(config);

    this.scanner = this.initializeScanner(config.address);
    this.scanner.start();

    this.log.debug("Initialized accessory");
  }

  set temperature(newValue) {
    this.latestTemperature = newValue;
    this.lastUpdatedAt = Date.now();
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

  set humidity(newValue) {
    this.latestHumidity = newValue;
    this.lastUpdatedAt = Date.now();
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

  set batteryLevel(newValue) {
    this.latestBatteryLevel = newValue;
    this.lastUpdatedAt = Date.now();
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

  get temperatureMQTTTopic() {
    return this.config.mqtt && this.config.mqtt.temperatureTopic;
  }

  get humidityMQTTTopic() {
    return this.config.mqtt && this.config.mqtt.humidityTopic;
  }

  get batteryMQTTTopic() {
    return this.config.mqtt && this.config.mqtt.batteryTopic;
  }

  initializeScanner(address) {
    const scanner = new Scanner(this.log, address);
    scanner.on("temperatureChange", (temperature, peripheral) => {
      const { address } = peripheral;
      this.log.debug(`[${address}] Temperature: ${temperature}C`);
      this.temperature = temperature;
    });
    scanner.on("humidityChange", (humidity, peripheral) => {
      const { address } = peripheral;
      this.log.debug(`[${address}] Humidity: ${humidity}%`);
      this.humidity = humidity;
    });
    scanner.on("batteryChange", (batteryLevel, peripheral) => {
      const { address } = peripheral;
      this.log.debug(`[${address}] Battery level: ${batteryLevel}%`);
      this.batteryLevel = batteryLevel;
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
      !this.fakeGatoEnabled ||
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

  configureMQTTClient(config) {
    const mqttConfig = config.mqtt;
    if (mqttConfig == null || mqttConfig.url == null) {
      return;
    }
    const client = mqtt.connect(
      mqttConfig.url,
      {
        username: mqttConfig.username || undefined,
        password: mqttConfig.password || undefined,
        qos: mqttConfig.qos || undefined
      }
    );
    client.on("connect", () => {
      this.log.info("MQTT Client connected.");
    });
    client.on("close", () => {
      this.log.info("MQTT Client disconnected");
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
    if (!this.fakeGatoEnabled) {
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

  onCharacteristicGetValue(callback, value) {
    if (value == null) {
      callback(new Error("Undefined characteristic value"));
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
      .on("get", callback =>
        this.onCharacteristicGetValue(callback, this.temperature)
      );
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
      .on("get", callback =>
        this.onCharacteristicGetValue(callback, this.humidity)
      );
    return humidityService;
  }

  getBatteryService() {
    const batteryService = new Service.BatteryService("Battery");
    batteryService
      .getCharacteristic(Characteristic.BatteryLevel)
      .on("get", callback =>
        this.onCharacteristicGetValue(callback, this.batteryLevel)
      );
    batteryService.setCharacteristic(
      Characteristic.ChargingState,
      Characteristic.ChargingState.NOT_CHARGEABLE
    );
    batteryService
      .getCharacteristic(Characteristic.StatusLowBattery)
      .on("get", callback => {
        let batteryStatus;
        if (this.batteryLevel == null) {
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
