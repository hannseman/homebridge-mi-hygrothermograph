/* eslint-disable no-bitwise */
const { Parser } = require('binary-parser');

const UUID = 'fe95';

const TEMPERATURE_EVENT = 4100;
const HUMIDITY_EVENT = 4102;
const BATTERY_EVENT = 4106;
const TEMPERATURE_AND_HUMIDITY_EVENT = 4109;

const decimalFormatter = value => value / 10;

const temperateAndHumidityParser = new Parser()
  .endianess('little')
  .uint8('length')
  .uint16('temperature', { formatter: decimalFormatter })
  .uint16('humidity', { formatter: decimalFormatter });

const temperatureParser = new Parser()
  .endianess('little')
  .uint8('length')
  .uint16('temperature', { formatter: decimalFormatter });

const humidityParser = new Parser()
  .endianess('little')
  .uint8('length')
  .uint16('humidity', { formatter: decimalFormatter });

const batteryParser = new Parser()
  .endianess('little')
  .uint8('length')
  .uint8('battery');

const serviceDataParser = new Parser()
  .endianess('little')
  .nest('flags', {
    type: new Parser()
      .endianess('little')
      .bit1('newFactory')
      .bit1('connected')
      .bit1('central')
      .bit1('encrypted')
      .bit1('macAddress')
      .bit1('capability')
      .bit1('event')
      .bit1('customData')
      .bit1('subtitle')
      .bit1('binding'),
  })
  .uint16('id')
  .uint8('index')
  .string('macAddress', { length: 5, encoding: 'hex' })
  .nest('capability', {
    type: new Parser()
      .endianess('little')
      .bit1('connectable')
      .bit1('central')
      .bit1('encrypt')
      .bit1('io'),
  })
  .uint16('eventType')
  .choice('event', {
    tag: 'eventType',
    choices: {
      4100: temperatureParser,
      4102: humidityParser,
      4106: batteryParser,
      4109: temperateAndHumidityParser,
    },
  });

function parseServiceData(buffer) {
  const version = (buffer.readUInt8(1) & 0xF0) >> 4;
  const result = serviceDataParser.parse(buffer);
  return {
    version,
    result,
  };
}

module.exports = {
  parseServiceData,
  UUID,
  TEMPERATURE_EVENT,
  HUMIDITY_EVENT,
  BATTERY_EVENT,
  TEMPERATURE_AND_HUMIDITY_EVENT,
};
