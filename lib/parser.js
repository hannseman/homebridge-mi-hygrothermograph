/* eslint-disable no-bitwise */

const SERVICE_DATA_UUID = 'fe95';

const frameControlFlags = {
  isFactoryNew: 1 << 0,
  isConnected: 1 << 1,
  isCentral: 1 << 2,
  isEncrypted: 1 << 3,
  hasMacAddress: 1 << 4,
  hasCapabilities: 1 << 5,
  hasEvent: 1 << 6,
  hasCustomData: 1 << 7,
  hasSubtitle: 1 << 8,
  hasBinding: 1 << 9,
};

const capabilityFlags = {
  connectable: 1 << 0,
  central: 1 << 1,
  secure: 1 << 2,
};

const TEMPERATURE_EVENT = 4100;
const HUMIDITY_EVENT = 4102;
const BATTERY_EVENT = 4106;
const TEMPERATURE_AND_HUMIDITY_EVENT = 4109;

class Parser {
  constructor(buffer) {
    this.baseByteLength = 5;
    if (buffer === undefined || buffer.length < this.baseByteLength) {
      throw new Error('Service data length must be >= 5 bytes');
    }
    this.buffer = buffer;
  }

  parse() {
    this.frameControl = this.parseFrameControl();
    this.productId = this.parseProductId();
    this.frameCounter = this.parseFrameCounter();
    this.macAddress = this.parseMacAddress();
    this.capabilities = this.parseCapabilities();
    this.eventType = this.parseEventType();
    this.eventLength = this.parseEventLength();
    this.event = this.parseEventData();

    return {
      frameControl: this.frameControl,
      event: this.event,
      productId: this.productId,
      frameCounter: this.frameCounter,
      macAddress: this.macAddress,
      eventType: this.eventType,
      capabilities: this.capabilities,
      eventLength: this.eventLength,
    };
  }

  parseFrameControl() {
    const frameControl = this.buffer.readUInt8(0) | this.buffer.readUInt8(1);
    return Object.keys(frameControlFlags).reduce((map, flag) => {
      // eslint-disable-next-line no-param-reassign
      map[flag] = (frameControl & frameControlFlags[flag]) !== 0;
      return map;
    }, {});
  }

  parseProductId() {
    return this.buffer.readUInt16LE(2);
  }

  parseFrameCounter() {
    return this.buffer.readUInt8(4);
  }

  parseMacAddress() {
    if (!this.frameControl.hasMacAddress) {
      return null;
    }
    return this.buffer.toString('hex', this.baseByteLength, this.baseByteLength + 5);
  }

  get capabilityOffset() {
    if (!this.frameControl.hasMacAddress) {
      return this.baseByteLength;
    }
    return 10;
  }

  parseCapabilities() {
    if (!this.frameControl.hasCapabilities) {
      return null;
    }
    const capabilities = this.buffer.readUInt8(this.capabilityOffset);
    return Object.keys(capabilityFlags).reduce((map, flag) => {
      // eslint-disable-next-line no-param-reassign
      map[flag] = (capabilities & capabilityFlags[flag]) !== 0;
      return map;
    }, {});
  }

  get eventOffset() {
    let offset = this.baseByteLength;
    if (this.frameControl.hasMacAddress) {
      offset = 10;
    }
    if (this.frameControl.hasCapabilities) {
      offset += 1;
    }
    return offset;
  }

  parseEventType() {
    if (!this.frameControl.hasEvent) {
      return null;
    }
    return this.buffer.readUInt16LE(this.eventOffset);
  }

  parseEventLength() {
    if (!this.frameControl.hasEvent) {
      return null;
    }
    return this.buffer.readUInt8(this.eventOffset + 2);
  }

  parseEventData() {
    if (!this.frameControl.hasEvent) {
      return null;
    }
    switch (this.eventType) {
      case TEMPERATURE_EVENT: {
        return this.parseTemperatureEvent();
      }
      case HUMIDITY_EVENT: {
        return this.parseHumidityEvent();
      }
      case BATTERY_EVENT: {
        return this.parseBatteryEvent();
      }
      case TEMPERATURE_AND_HUMIDITY_EVENT: {
        return this.parseTemperatureAndHumidityEvent();
      }
      default: {
        throw new Error(`Unknown event type: ${this.eventType}`);
      }
    }
  }

  parseTemperatureEvent() {
    return {
      temperature: this.buffer.readInt16LE(this.eventOffset + 3) / 10,
    };
  }

  parseHumidityEvent() {
    return {
      humidity: this.buffer.readUInt16LE(this.eventOffset + 3) / 10,
    };
  }

  parseBatteryEvent() {
    return {
      battery: this.buffer.readUInt8(this.eventOffset + 3),
    };
  }

  parseTemperatureAndHumidityEvent() {
    const temperature = this.buffer.readUInt16LE(this.eventOffset + 3) / 10;
    const humidity = this.buffer.readUInt16LE(this.eventOffset + 5) / 10;
    return { temperature, humidity };
  }
}

module.exports = {
  Parser,
  TEMPERATURE_EVENT,
  HUMIDITY_EVENT,
  BATTERY_EVENT,
  TEMPERATURE_AND_HUMIDITY_EVENT,
  SERVICE_DATA_UUID,
};
