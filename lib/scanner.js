const EventEmitter = require("events");
const noble = require("noble");
const { Parser, EventTypes, SERVICE_DATA_UUID } = require("./parser");

class Scanner extends EventEmitter {
  constructor(log, address) {
    super();
    this.log = log;
    this.address = address;
    noble.on("discover", this.onDiscover.bind(this));
    noble.on("scanStart", () => {
      this.log.debug("Started scanning.");
    });
    noble.on("scanStop", () => {
      this.log.debug("Stopped scanning.");
    });
    noble.on("warning", message => {
      this.log.info("Warning: ", message);
    });
  }

  start() {
    noble.on("stateChange", state => {
      if (state === "poweredOn") {
        this.log.info("Start scanning.");
        noble.startScanning([], true);
      } else {
        this.log.info(`Stop scanning. (${state})`);
        noble.stopScanning();
      }
    });
  }

  onDiscover(peripheral) {
    const {
      advertisement: { serviceData },
      id,
      address
    } = peripheral;

    if (!this.isValidAddress(address)) {
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
      case EventTypes.temperature: {
        const { temperature } = event;
        this.emit("temperatureChange", temperature, { id, address });
        break;
      }
      case EventTypes.humidity: {
        const { humidity } = event;
        this.emit("humidityChange", humidity, { id, address });
        break;
      }
      case EventTypes.battery: {
        const { battery } = event;
        this.emit("batteryChange", battery, { id, address });
        break;
      }
      case EventTypes.temperatureAndHumidity: {
        const { temperature, humidity } = event;
        this.emit("temperatureChange", temperature, { id, address });
        this.emit("humidityChange", humidity, { id, address });
        break;
      }
      case EventTypes.illuminance: {
        const { illuminance } = event;
        this.emit("illuminanceChange", illuminance, { id, address });
        break;
      }
      case EventTypes.moisture: {
        const { moisture } = event;
        this.emit("moistureChange", moisture, { id, address });
        break;
      }
      case EventTypes.fertility: {
        const { fertility } = event;
        this.emit("fertilityChange", fertility, { id, address });
        break;
      }
      default: {
        this.emit("error", new Error(`Unknown event type ${eventType}`));
        break;
      }
    }
  }

  isValidAddress(address) {
    return (
      this.address == null ||
      this.address.toLowerCase() === address.toLowerCase()
    );
  }

  getValidServiceData(serviceData) {
    return serviceData.find(
      data => data.uuid.toLowerCase() === SERVICE_DATA_UUID
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
      advertisement: { localName }
    },
    serviceData
  }) {
    this.log.debug(`[${address}] Discovered peripheral
      Id: ${id}
      LocalName: ${localName}
      rssi: ${rssi}
      serviceData: ${serviceData.data.toString("hex")}`);
  }
}

module.exports = { Scanner };
