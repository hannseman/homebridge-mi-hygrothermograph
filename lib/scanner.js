const EventEmitter = require('events');
const noble = require('noble');
const Parser = require('./parser');

class Scanner extends EventEmitter {
  constructor(log) {
    super();
    this.log = log;
    noble.on('discover', this.onDiscover.bind(this));
  }

  start() {
    noble.on('stateChange', (state) => {
      if (state === 'poweredOn') {
        this.log.debug('Started scanning');
        noble.startScanning([], true);
      } else {
        this.log.debug('Stopped scanning');
        noble.stopScanning();
      }
    });
  }
  onDiscover(peripheral) {
    const {
      advertisement, id, rssi, address,
    } = peripheral;
    const { localName, serviceData } = advertisement;
    const miServiceData = serviceData.find(data => data.uuid.toString('hex') === Parser.UUID);
    if (!miServiceData) {
      return;
    }
    this.log.debug('Discovered peripheral');
    this.log.debug(id, address, localName, rssi);
    const { result } = Parser.parseServiceData(miServiceData.data);
    this.log.debug(result);

    const { eventType, event } = result;
    switch (eventType) {
      case Parser.TEMPERATURE_EVENT: {
        const { temperature } = event;
        this.emit('temperatureChange', temperature);
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
        this.emit('temperatureChange', temperature);
        this.emit('humidityChange', humidity);
        break;
      }
      default: {
        break;
      }
    }
  }
}

module.exports = { Scanner };
