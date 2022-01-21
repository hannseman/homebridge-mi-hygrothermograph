const EventEmitter = require("events");

class CharacteristicMock extends EventEmitter {
  constructor() {
    super();
    this.BATTERY_LEVEL_LOW = 0;
    this.BATTERY_LEVEL_NORMAL = 1;
    this.NOT_CHARGEABLE = 2;
  }
  setProps() {
    return this;
  }
  updateValue() {
    return this;
  }
}

class ServiceMock {
  setCharacteristic() {
    return this;
  }
  getCharacteristic(type) {
    return type;
  }
}

const logMock = { debug() {}, error() {}, warn() {}, info() {} };

class NobleMock extends EventEmitter {
  startScanning() {}
  stopScanning() {}
}

class PeripheralMock {
  constructor(
    event,
    address = "4c:65:a8:d0:ae:64",
    id = "4c65a8d0ae65",
    uuid = "fe95"
  ) {
    this.id = id;
    this.address = address;
    this.rssi = -67;
    this.advertisement = {
      localName: "MJ_HT_V1",
      serviceData: [
        {
          uuid,
          data: event,
        },
      ],
    };
  }
}

class FakeGatoHistoryServiceMock {
  constructor(type, accessory, optionalParams) {
    this.type = type;
    this.accessory = accessory;
    this.optionalParams = optionalParams;
  }

  addEntry() {}
}

class ParseMock {
  parse() {
    return {
      event: undefined,
      frameControl: { hasEvent: true },
      eventType: 1337,
    };
  }
}

class NoEventParseMock {
  parse() {
    return {
      event: undefined,
      frameControl: { hasEvent: false },
      eventType: 1337,
    };
  }
}

class MQTTMock extends EventEmitter {
  publish() {}
  end() {}
}

module.exports = {
  CharacteristicMock,
  ServiceMock,
  PeripheralMock,
  ParseMock,
  FakeGatoHistoryServiceMock,
  NoEventParseMock,
  mockLogger: logMock,
  nobleMock: new NobleMock(),
  mqttMock: { connect: () => new MQTTMock() },
};
