/*
var buffer = Buffer.from([0x88,0x10,0xd6,0x94,0x11,0x34,0x2d,0x58,0x01,0x04,0x08,0x01,0x7e,0x01,0x02,0x01,0x14]);
var mac = buffer.slice(2,8);
var mac = mac.reverse();

var temp = buffer.readUInt16LE(10) / 10;
var hum = buffer.readUInt16LE(12) / 10;
var bat = buffer.readUInt8(16)

console.log("[" + mac.toString("hex") + "]" , "temp: " + temp, "hum:" + hum, "battery:" + bat + "%" );
*/

const crypto = require("crypto");

const SERVICE_DATA_UUID = "fdcd";

const MAC_START = 2;
const MAC_END = 8;

const EventTypes = {
  temperatureAndHumidity: 4109
};

class Parser {
  constructor(buffer) {
    this.baseByteLength = 5;
    if (buffer == null) {
      throw new Error("A buffer must be provided.");
    }
    this.buffer = buffer;
    if (buffer.length < this.baseByteLength) {
      throw new Error(
        `Service data length must be >= 5 bytes. ${this.toString()}`
      );
    }
  }

  parse() {
    this.eventType = 4109;
    this.event = this.parseEventData();
    console.log("event" + JSON.stringify(this.event));
    return {
      macAddress: this.macAddress,
      eventType: this.eventType,
      event: this.event,
    };
  }

  parseMacAddress() {
    if (!this.frameControl.hasMacAddress) {
      return null;
    }
    const macBuffer = this.buffer.slice(MAC_START, MAC_END);
    return Buffer.from(macBuffer).reverse().toString("hex");
  }

  parseEventType() {
    return 4109;
  }

  parseEventData() {
    return this.parseTemperatureAndHumidityEvent();
  }

  parseTemperatureAndHumidityEvent() {
    const temperature = this.buffer.readInt16LE(10) / 10;
    const humidity = this.buffer.readUInt16LE(12) / 10;
    const battery = this.buffer.readUInt8(16);
    return { temperature, humidity, battery };
  }

  toString() {
    return this.buffer.toString("hex");
  }
}

module.exports = {
  Parser,
  EventTypes,
  SERVICE_DATA_UUID,
};
