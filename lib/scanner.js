const EventEmitter = require("events");
const noble = require("noble");
const { Parser, EventTypes, SERVICE_DATA_UUID } = require("./parser");

class Scanner extends EventEmitter {
  constructor(log, address) {
    super();
    this.log = log;
    this.address = address;
    noble.on("discover", this.onDiscover.bind(this));
  }

  start() {
    noble.on("stateChange", state => {
      if (state === "poweredOn") {
        this.log.debug("Started scanning");
        noble.startScanning([], true);
      } else {
        this.log.debug("Stopped scanning");
        noble.stopScanning();
      }
    });
  }

  onDiscover(peripheral) {
    const { advertisement, id, rssi, address } = peripheral;
    if (
      this.address != null &&
      this.address.toLowerCase() !== address.toLowerCase()
    ) {
      return;
    }
    const { localName, serviceData } = advertisement;
    const miServiceData = serviceData.find(
      data => data.uuid.toString("hex") === SERVICE_DATA_UUID
    );
    if (!miServiceData) {
      return;
    }
    this.log.debug(`[${address}] Discovered peripheral
      Id: ${id}
      LocalName: ${localName}
      rssi: ${rssi}
      serviceData: ${miServiceData.data.toString("hex")}`);

    let result;
    try {
      result = new Parser(miServiceData.data).parse();
    } catch (err) {
      this.emit("error", err);
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
      default: {
        this.emit("error", new Error(`Unknown event type ${eventType}`));
        break;
      }
    }
  }
}

module.exports = { Scanner };
