const EventEmitter = require("events");
const noble = require("@abandonware/noble");
const { Parser, EventTypes, SERVICE_DATA_UUID } = require("./parser");

class Scanner extends EventEmitter {
  constructor(address, options) {
    super();
    options = options || {};
    const {
      log = console,
      forceDiscovering = true,
      restartDelay = 2500,
    } = options;
    this.log = log;
    this.address = address;
    this.forceDiscovering = forceDiscovering;
    this.restartDelay = restartDelay;

    this.scanning = false;
    this.configure();
  }

  configure() {
    noble.on("discover", this.onDiscover.bind(this));
    noble.on("scanStart", this.onScanStart.bind(this));
    noble.on("scanStop", this.onScanStop.bind(this));
    noble.on("warning", this.onWarning.bind(this));
    noble.on("stateChange", this.onStateChange.bind(this));
  }

  start() {
    this.log.debug("Start scanning.");
    try {
      noble.startScanning([], true);
      this.scanning = true;
    } catch (e) {
      this.scanning = false;
      this.log.error(e);
    }
  }

  stop() {
    this.scanning = false;
    noble.stopScanning();
  }

  onStateChange(state) {
    if (state === "poweredOn") {
      this.start();
    } else {
      this.log.info(`Stop scanning. (${state})`);
      this.stop();
    }
  }

  onWarning(message) {
    this.log.info("Warning: ", message);
  }

  onScanStart() {
    this.log.debug("Started scanning.");
  }

  onScanStop() {
    this.log.debug("Stopped scanning.");
    // We are scanning but something stopped it. Restart scan.
    if (this.scanning && this.forceDiscovering) {
      setTimeout(() => {
        this.log.debug("Restarting scan.");
        this.start();
      }, this.restartDelay);
    }
  }

  onDiscover(peripheral) {
    const { advertisement: { serviceData } = {}, id, address } =
      peripheral || {};

    if (!this.isValidAddress(address) && !this.isValidAddress(id)) {
      return;
    }

    const miServiceData = this.getValidServiceData(serviceData);
    if (!miServiceData) {
      return;
    }

    this.logPeripheral({ peripheral, serviceData: miServiceData });

    const result = this.parseServiceData(miServiceData.data);
    if (result == null) {
      return;
    }

    const { eventType, event } = result;
    switch (eventType) {
      case EventTypes.temperatureAndHumidity: {
        const { temperature, humidity, battery } = event;
        this.emit("temperatureChange", temperature, { id, address });
        this.emit("humidityChange", humidity, { id, address });
        this.emit("batteryChange", battery, { id, address });
        break;
      }
      default: {
        this.emit("error", new Error(`Unknown event type ${eventType}`));
        return;
      }
    }
    this.emit("change", event, { id, address });
  }

  cleanAddress(address) {
    if (address == null) {
      return address;
    }
    return address.toLowerCase().replace(/[:-]/g, "");
  }

  isValidAddress(address) {
    return (
      this.address == null ||
      this.cleanAddress(this.address) === this.cleanAddress(address)
    );
  }

  getValidServiceData(serviceData) {
    return (
      serviceData &&
      serviceData.find((data) => data.uuid.toLowerCase() === SERVICE_DATA_UUID)
    );
  }

  parseServiceData(serviceData) {
    try {
      return new Parser(serviceData).parse();
    } catch (error) {
      this.emit("error", error);
    }
  }

  logPeripheral({
    peripheral: {
      address,
      id,
      rssi,
      advertisement: { localName },
    },
    serviceData,
  }) {
    this.log.debug(`[${address || id}] Discovered peripheral ->
      Id: ${id}
      LocalName: ${localName}
      rssi: ${rssi}
      serviceData: ${serviceData.data.toString("hex")}`);
  }
}

module.exports = { Scanner };
