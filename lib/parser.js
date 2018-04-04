/* eslint-disable no-bitwise */

const SERVICE_DATA_UUID = 'fe95';

const FrameControlFlags = {
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

const CapabilityFlags = {
  connectable: 1 << 0,
  central: 1 << 1,
  secure: 1 << 2,
};

const EventTypes = {
  temperature: 4100,
  humidity: 4102,
  battery: 4106,
  temperatureAndHumidity: 4109,
};


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
    return Object.keys(FrameControlFlags).reduce((map, flag) => {
      // eslint-disable-next-line no-param-reassign
      map[flag] = (frameControl & FrameControlFlags[flag]) !== 0;
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
    return Object.keys(CapabilityFlags).reduce((map, flag) => {
      // eslint-disable-next-line no-param-reassign
      map[flag] = (capabilities & CapabilityFlags[flag]) !== 0;
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
      case EventTypes.temperature: {
        return this.parseTemperatureEvent();
      }
      case EventTypes.humidity: {
        return this.parseHumidityEvent();
      }
      case EventTypes.battery: {
        return this.parseBatteryEvent();
      }
      case EventTypes.temperatureAndHumidity: {
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
    const temperature = this.buffer.readInt16LE(this.eventOffset + 3) / 10;
    const humidity = this.buffer.readUInt16LE(this.eventOffset + 5) / 10;
    return { temperature, humidity };
  }
}

module.exports = {
  Parser,
  EventTypes,
  SERVICE_DATA_UUID,
};
