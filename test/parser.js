const assert = require('assert');
const { describe, it } = require('mocha');
const { parseServiceData } = require('../lib/parser');

describe('parser', () => {
  it('should parse flags', () => {
    const { result } = parseServiceData(Buffer.from('5020aa01b064aed0a8654c0d1004d9006001', 'hex'));
    assert.deepEqual(result.flags, {
      newFactory: 0,
      connected: 0,
      central: 0,
      encrypted: 0,
      macAddress: 1,
      capability: 0,
      event: 1,
      customData: 0,
      subtitle: 0,
      binding: 0,
    });
  });

  it('should parse id', () => {
    const { result } = parseServiceData(Buffer.from('5020aa01b064aed0a8654c0d1004d9006001', 'hex'));
    assert.equal(result.id, 426);
  });

  it('should parse index', () => {
    const { result } = parseServiceData(Buffer.from('5020aa01b064aed0a8654c0d1004d9006001', 'hex'));
    assert.equal(result.index, 176);
  });

  it('should parse macAddress', () => {
    const { result } = parseServiceData(Buffer.from('5020aa01b064aed0a8654c0d1004d9006001', 'hex'));
    assert.equal(result.macAddress, '64aed0a865');
  });

  it('should parse capability', () => {
    const { result } = parseServiceData(Buffer.from('5020aa01b064aed0a8654c0d1004d9006001', 'hex'));
    assert.deepEqual(result.capability, {
      connectable: 0,
      central: 0,
      encrypt: 1,
      io: 1,
    });
  });

  it('should parse humidity and temperature data', () => {
    const { result } = parseServiceData(Buffer.from('5020aa01b064aed0a8654c0d1004d9006001', 'hex'));
    assert.equal(result.eventType, 4109);
    assert.equal(result.event.temperature, 21.7);
    assert.equal(result.event.humidity, 35.2);
  });

  it('should parse temperature data', () => {
    const { result } = parseServiceData(Buffer.from('5020aa01a664aed0a8654c041002d900', 'hex'));
    assert.equal(result.eventType, 4100);
    assert.equal(result.event.temperature, 21.7);
  });

  it('should parse humidity data', () => {
    const { result } = parseServiceData(Buffer.from('5020aa01a164aed0a8654c0610025d01', 'hex'));
    assert.equal(result.eventType, 4102);
    assert.equal(result.event.humidity, 34.9);
  });

  it('should parse battery data', () => {
    const { result } = parseServiceData(Buffer.from('5020aa014e65aed0a8654c0a10015d', 'hex'));
    assert.equal(result.eventType, 4106);
    assert.equal(result.event.battery, 93);
  });
});
