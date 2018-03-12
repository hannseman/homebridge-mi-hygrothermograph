const EventEmitter = require('events');
const noble = require('noble');
const Parser = require('./parser');

class Scanner extends EventEmitter {
  constructor() {
    super();
    noble.on('discover', this.onDiscover.bind(this));
  }

  start() {
    noble.on('stateChange', (state) => {
      if (state === 'poweredOn') {
        noble.startScanning([], true);
      } else {
        noble.stopScanning();
      }
    });
  }
  onDiscover(peripheral) {
    const { advertisement } = peripheral;
    const { serviceData } = advertisement;
    const miServiceData = serviceData.find(data => data.uuid.equals(Parser.UUID));
    if (!miServiceData) {
      return;
    }
    const { result } = Parser.parseServiceData(miServiceData);
    const { eventType, event } = result;
    switch (eventType) {
      case Parser.TEMPERATURE_EVENT: {
        const { temperature } = event;
        this.emit('temperateChange', temperature);
        break;
      }
      case Parser.HUMIDITY_EVENT: {
        const { humidity } = event;
        this.emit('humidityChange', humidity);
        break;
      }
      case Parser.BATTERY_EVENT: {
        const { battery } = event;
        this.emit('batteryChange', battery);
        break;
      }
      case Parser.TEMPERATURE_AND_HUMIDITY_EVENT: {
        const { temperature, humidity } = event;
        this.emit('temperateChange', temperature);
        this.emit('humidityChange', humidity);
        break;
      }
      default: {
        break;
      }
    }
  }
}

module.exports = new Scanner();
