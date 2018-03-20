const EventEmitter = require('events');
const noble = require('noble');
const {
  Parser,
  TEMPERATURE_EVENT,
  HUMIDITY_EVENT,
  BATTERY_EVENT,
  TEMPERATURE_AND_HUMIDITY_EVENT,
  SERVICE_DATA_UUID,
} = require('./parser');

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
    const miServiceData = serviceData.find(data => data.uuid.toString('hex') === SERVICE_DATA_UUID);
    if (!miServiceData) {
      return;
    }
    this.log.debug(`[${id}] Discovered peripheral
      Address: ${address}
      LocalName: ${localName}
      rssi: ${rssi}
      serviceData: ${miServiceData.data.toString('hex')}`);
    const result = new Parser(miServiceData.data).parse();

    const { eventType, event } = result;
    switch (eventType) {
      case TEMPERATURE_EVENT: {
        const { temperature } = event;
        this.emit('temperatureChange', temperature, peripheral.id);
        break;
      }
      case HUMIDITY_EVENT: {
        const { humidity } = event;
        this.emit('humidityChange', humidity, peripheral.id);
        break;
      }
      case BATTERY_EVENT: {
        const { battery } = event;
        this.emit('batteryChange', battery, peripheral.id);
        break;
      }
      case TEMPERATURE_AND_HUMIDITY_EVENT: {
        const { temperature, humidity } = event;
        this.emit('temperatureChange', temperature, peripheral.id);
        this.emit('humidityChange', humidity, peripheral.id);
        break;
      }
      default: {
        break;
      }
    }
  }
}

module.exports = { Scanner };
