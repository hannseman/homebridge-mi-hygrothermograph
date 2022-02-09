const mqtt = require("mqtt");
const { Scanner } = require("./scanner");
const { version } = require("../package.json");

let Service;
let Characteristic;
let FakeGatoHistoryService;
let homebridgeAPI;

const defaultTimeout = 15;

const AccessoryType = {
  Hygrotermograph: "Hygrotermograph",
  MiFlora: "MiFlora",
};

class HygrothermographAccessory {
  constructor(log, config) {
    this.log = log;
    this.config = config || {};
    this.type = this.config.type || AccessoryType.Hygrotermograph;
    this.displayName = this.config.name;

    this.latestBatteryLevel = undefined;
    this.lastUpdatedAt = undefined;
    this.lastBatchUpdatedAt = undefined;

    this.latestTemperature = undefined;
    this.temperatureMQTTTopic = undefined;
    this.batteryMQTTTopic = undefined;
    switch (this.type) {
      case AccessoryType.Hygrotermograph:
        this.latestHumidity = undefined;

        this.humidityService = this.getHumidityService();

        this.humidityMQTTTopic = undefined;
        break;
      case AccessoryType.MiFlora:
        this.latestIlluminance = undefined;
        this.latestFertility = undefined;
        this.latestMoisture = undefined;

        this.illuminanceService = this.getIlluminanceService();
        this.fertilityService = this.getFertilityService();
        this.moistureService = this.getMoistureService();

        this.illuminanceMQTTTopic = undefined;
        this.fertilityMQTTTopic = undefined;
        this.moistureMQTTTopic = undefined;
        break;
      default:
        throw Error(`Unsupported accessory type "${this.type}"`);
    }
    this.informationService = this.getInformationService();
    this.batteryService = this.getBatteryService();
    this.fakeGatoHistoryService = this.getFakeGatoHistoryService();
    this.temperatureService = this.getTemperatureService();

    this.mqttClient = this.setupMQTTClient();

    this.scanner = this.setupScanner();

    this.log.debug(`Initialized accessory of type ${this.type}`);
  }

  setTemperature(newValue, force = false) {
    if (newValue == null) {
      return;
    }
    this.latestTemperature = newValue;
    this.lastUpdatedAt = Date.now();
    if (this.useBatchUpdating && force === false) {
      return;
    }
    this.temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(newValue);
    this.addFakeGatoHistoryEntry();
    this.publishValueToMQTT(this.temperatureMQTTTopic, this.temperature);
  }

  get temperature() {
    if (this.hasTimedOut() || this.latestTemperature == null) {
      return;
    }
    return this.latestTemperature + this.temperatureOffset;
  }

  setIlluminance(newValue, force = false) {
    const MinMaxIlluminanceValues = { min: 0.0001, max: 100000 };
    if (newValue == null) {
      return;
    }
    // Validate values according to https://developers.homebridge.io/#/characteristic/CurrentAmbientLightLevel
    newValue =
      newValue > MinMaxIlluminanceValues.max
        ? MinMaxIlluminanceValues.max
        : newValue;
    newValue =
      newValue < MinMaxIlluminanceValues.min
        ? MinMaxIlluminanceValues.min
        : newValue;
    this.latestIlluminance = newValue;
    this.lastUpdatedAt = Date.now();
    if (this.useBatchUpdating && force === false) {
      return;
    }
    this.illuminanceService
      .getCharacteristic(Characteristic.CurrentAmbientLightLevel)
      .updateValue(newValue);
    this.addFakeGatoHistoryEntry();
    this.publishValueToMQTT(this.illuminanceMQTTTopic, this.illuminance);
  }

  get illuminance() {
    if (this.hasTimedOut() || this.latestIlluminance == null) {
      return;
    }
    return this.latestIlluminance + this.temperatureOffset;
  }

  setMoisture(newValue, force = false) {
    if (newValue == null) {
      return;
    }
    this.latestMoisture = newValue;
    this.lastUpdatedAt = Date.now();
    if (this.useBatchUpdating && force === false) {
      return;
    }
    this.moistureService
      .getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .updateValue(newValue);
    this.addFakeGatoHistoryEntry();
    this.publishValueToMQTT(this.moistureMQTTTopic, this.moisture);
  }

  get moisture() {
    if (this.hasTimedOut() || this.latestMoisture == null) {
      return;
    }
    return this.latestMoisture + this.moistureOffset;
  }

  setFertility(newValue, force = false) {
    if (newValue == null) {
      return;
    }
    this.latestFertility = newValue;
    this.lastUpdatedAt = Date.now();
    if (this.useBatchUpdating && force === false) {
      return;
    }
    // TODO: Fertility Accessory and Characteristic
    this.fertilityService
      .getCharacteristic(Characteristic.CurrentAmbientLightLevel)
      .updateValue(newValue);
    this.addFakeGatoHistoryEntry();
    this.publishValueToMQTT(this.fertilityMQTTTopic, this.fertility);
  }

  get fertility() {
    if (this.hasTimedOut() || this.latestFertility == null) {
      return;
    }
    return this.latestFertility + this.fertilityOffset;
  }

  setHumidity(newValue, force = false) {
    if (newValue == null) {
      return;
    }
    this.latestHumidity = newValue;
    this.lastUpdatedAt = Date.now();
    if (this.useBatchUpdating && force === false) {
      return;
    }
    this.humidityService
      .getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .updateValue(newValue);
    this.addFakeGatoHistoryEntry();
    this.publishValueToMQTT(this.humidityMQTTTopic, this.humidity);
  }

  get humidity() {
    if (this.hasTimedOut() || this.latestHumidity == null) {
      return;
    }
    return this.latestHumidity + this.humidityOffset;
  }

  setBatteryLevel(newValue, force = false) {
    if (newValue == null) {
      return;
    }
    this.latestBatteryLevel = newValue;
    this.lastUpdatedAt = Date.now();
    if (this.useBatchUpdating && force === false) {
      return;
    }
    if (this.batteryService != null) {
      this.batteryService
        .getCharacteristic(Characteristic.BatteryLevel)
        .updateValue(newValue);
    }
    this.publishValueToMQTT(this.batteryMQTTTopic, this.batteryLevel);
  }

  get batteryLevel() {
    if (this.hasTimedOut()) {
      return;
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

  get illuminanceName() {
    return this.config.illuminanceName || "Illuminance";
  }

  get moistureName() {
    return this.config.moistureName || "Moisture";
  }

  get fertilityName() {
    return this.config.fertilityName || "Fertility";
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

  get temperatureOffset() {
    return this.config.temperatureOffset || 0;
  }

  get humidityOffset() {
    return this.config.humidityOffset || 0;
  }

  get moistureOffset() {
    return this.config.moistureOffset || 0;
  }

  get fertilityOffset() {
    return this.config.fertilityOffset || 0;
  }

  get isBatteryLevelDisabled() {
    return this.config.disableBatteryLevel || false;
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
    const address = this.config.address;
    if (address == null) {
      this.log.warn(
        "address option is not set. " +
          "When running multiple sensors this will cause interference. " +
          "See README for instructions."
      );
    }
    const scanner = new Scanner(this.config.address, {
      log: this.log,
      forceDiscovering: this.config.forceDiscovering !== false,
      restartDelay: this.config.forceDiscoveringDelay,
      bindKey: this.config.bindKey,
    });
    scanner.on("temperatureChange", (temperature, peripheral) => {
      const { address, id } = peripheral;
      this.log.debug(`[${address || id}] Temperature: ${temperature}C`);
      this.setTemperature(temperature);
    });
    switch (this.type) {
      case AccessoryType.Hygrotermograph:
        scanner.on("humidityChange", (humidity, peripheral) => {
          const { address, id } = peripheral;
          this.log.debug(`[${address || id}] Humidity: ${humidity}%`);
          this.setHumidity(humidity);
        });
        break;
      case AccessoryType.MiFlora:
        scanner.on("moistureChange", (moisture, peripheral) => {
          const { address, id } = peripheral;
          this.log.debug(`[${address || id}] Moisture: ${moisture}%`);
          this.setMoisture(moisture);
        });
        scanner.on("fertilityChange", (fertility, peripheral) => {
          const { address, id } = peripheral;
          this.log.debug(`[${address || id}] Fertility: ${fertility} μS/cm`);
          this.setFertility(fertility);
        });
        scanner.on("illuminanceChange", (illuminance, peripheral) => {
          const { address, id } = peripheral;
          this.log.debug(`[${address || id}] Illuminance: ${illuminance} lux`);
          this.setIlluminance(illuminance);
        });
        break;
      default:
        throw Error(
          `setupScanner not implemented for Accessory "${this.type}"`
        );
    }
    scanner.on("batteryChange", (batteryLevel, peripheral) => {
      const { address, id } = peripheral;
      this.log.debug(`[${address || id}] Battery level: ${batteryLevel}%`);
      this.setBatteryLevel(batteryLevel);
    });
    scanner.on("change", () => {
      if (this.isReadyForBatchUpdate() === false) {
        return;
      }
      this.log.debug("Batch updating values");
      this.lastBatchUpdatedAt = Date.now();
      switch (this.type) {
        case AccessoryType.Hygrotermograph:
          this.setHumidity(this.humidity, true);
          break;
        case AccessoryType.MiFlora:
          this.setMoisture(this.moisture, true);
          this.setFertility(this.fertility, true);
          this.setIlluminance(this.illuminance, true);
          break;
        default:
          throw Error(
            `scanner.on("change" not implemented for Accessory "${this.type}"`
          );
      }
      this.setTemperature(this.temperature, true);
      this.setBatteryLevel(this.batteryLevel, true);
    });
    scanner.on("error", (error) => {
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
        `[${this.config.address}] Timed out, last update: ${this.lastUpdatedISO8601}`
      );
    }
    return timedOut;
  }

  addFakeGatoHistoryEntry() {
    if (
      !this.isFakeGatoEnabled ||
      this.temperature == null ||
      this.humidity == null
    ) {
      return;
    }
    this.fakeGatoHistoryService.addEntry({
      time: new Date().getTime() / 1000,
      temp: this.temperature,
      humidity: this.humidity,
    });
  }

  setupMQTTClient() {
    const config = this.config.mqtt;
    if (config == null || config.url == null) {
      return;
    }

    let client;
    switch (this.type) {
      case AccessoryType.Hygrotermograph:
        var {
          temperatureTopic,
          humidityTopic,
          batteryTopic,
          url,
          ...mqttOptions
        } = config;

        this.humidityMQTTTopic = humidityTopic;
        this.temperatureMQTTTopic = temperatureTopic;
        this.batteryMQTTTopic = batteryTopic;

        client = mqtt.connect(url, mqttOptions);
        break;
      case AccessoryType.MiFlora:
        var {
          temperatureTopic,
          illuminanceTopic,
          moistureTopic,
          fertilityTopic,
          batteryTopic,
          url,
          ...mqttOptions
        } = config;

        this.illuminanceMQTTTopic = illuminanceTopic;
        this.fertilityMQTTTopic = fertilityTopic;
        this.moistureMQTTTopic = moistureTopic;
        this.temperatureMQTTTopic = temperatureTopic;
        this.batteryMQTTTopic = batteryTopic;

        client = mqtt.connect(url, mqttOptions);
        break;
      default:
        throw Error(
          `setupMQTTClient not implemented for Accessory "${this.type}"`
        );
    }

    client.on("connect", () => {
      this.log.info("MQTT Client connected.");
    });
    client.on("reconnect", () => {
      this.log.debug("MQTT Client reconnecting.");
    });
    client.on("close", () => {
      this.log.debug("MQTT Client disconnected");
    });
    client.on("error", (error) => {
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
      qos: this.config.mqtt.qos || 0,
      retain: this.config.mqtt.retain || false,
    });
  }

  getFakeGatoHistoryService() {
    if (!this.isFakeGatoEnabled) {
      return;
    }
    const serialNumber = this.serialNumber || this.constructor.name;
    const filename = `fakegato-history_${serialNumber}.json`;
    const path = this.fakeGatoStoragePath;
    return new FakeGatoHistoryService("room", this, {
      filename,
      path,
      storage: "fs",
      ...(this.config.fakeGatoOptions || {}),
    });
  }

  getInformationService() {
    let manufacturer;
    let model;
    switch (this.type) {
      case AccessoryType.Hygrotermograph:
        manufacturer = "Cleargrass Inc";
        model = "LYWSDCGQ01ZM";
        break;
      case AccessoryType.MiFlora:
        manufacturer = "HHCC Plant Technology Co., Ltd";
        model = "HHCCJCY01HHCC";
        break;
      default:
        throw Error(
          `getInformationService not implemented for Accessory "${this.type}"`
        );
    }
    const accessoryInformation = new Service.AccessoryInformation()
      .setCharacteristic(Characteristic.Manufacturer, manufacturer)
      .setCharacteristic(Characteristic.Model, model)
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
      .setProps({ minValue: -40 });
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

  getMoistureService() {
    const moistureService = new Service.HumiditySensor(this.moistureName);
    moistureService
      .getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .on("get", this.onCharacteristicGetValue.bind(this, "moisture"));
    return moistureService;
  }

  getIlluminanceService() {
    const illuminanceService = new Service.LightSensor(this.illuminanceName);
    illuminanceService
      .getCharacteristic(Characteristic.CurrentAmbientLightLevel)
      .on("get", this.onCharacteristicGetValue.bind(this, "illuminance"));
    return illuminanceService;
  }

  getFertilityService() {
    const fertilityService = new Service.LightSensor(
      this.fertilityName,
      "customFertility"
    );
    fertilityService
      .getCharacteristic(Characteristic.CurrentAmbientLightLevel)
      .on("get", this.onCharacteristicGetValue.bind(this, "fertility"));
    return fertilityService;
  }

  getBatteryService() {
    if (this.isBatteryLevelDisabled) {
      return;
    }
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
    let services = [
      this.informationService,
      this.batteryService,
      this.fakeGatoHistoryService,
    ];
    switch (this.type) {
      case AccessoryType.Hygrotermograph:
        services.push(this.temperatureService, this.humidityService);
        break;
      case AccessoryType.MiFlora:
        services.push(
          this.moistureService,
          this.illuminanceService,
          this.temperatureService,
          this.fertilityService
        );
        break;
      default:
        throw Error(`getServices not implemented for Accessory "${this.type}"`);
    }
    return services.filter(Boolean);
  }
}

module.exports = (homebridge) => {
  FakeGatoHistoryService = require("fakegato-history")(homebridge);
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridgeAPI = homebridge;
  return { HygrothermographAccessory, AccessoryType };
};
