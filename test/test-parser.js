const assert = require('assert');
const { describe, it } = require('mocha');
const { Parser } = require('../lib/parser');

describe('parser', () => {
  it('should parse frame control', () => {
    const buffer = Buffer.from('5020aa01b064aed0a8654c0d1004d9006001', 'hex');
    const result = new Parser(buffer).parse();
    assert.deepEqual(result.frameControl, {
      isFactoryNew: false,
      isConnected: false,
      isCentral: false,
      isEncrypted: false,
      hasMacAddress: true,
      hasCapabilities: true,
      hasEvent: true,
      hasCustomData: false,
      hasSubtitle: false,
      hasBinding: false,
    });
  });

  it('should parse product id', () => {
    const buffer = Buffer.from('5020aa01b064aed0a8654c0d1004d9006001', 'hex');
    const result = new Parser(buffer).parse();

    assert.equal(result.productId, 426);
  });

  it('should parse frame counter', () => {
    const buffer = Buffer.from('5020aa01b064aed0a8654c0d1004d9006001', 'hex');
    const result = new Parser(buffer).parse();
    assert.equal(result.frameCounter, 176);
  });

  it('should parse macAddress', () => {
    const buffer = Buffer.from('5020aa01b064aed0a8654c0d1004d9006001', 'hex');
    const result = new Parser(buffer).parse();
    assert.equal(result.macAddress, '64aed0a865');
  });

  it('should parse capabilities', () => {
    const buffer = Buffer.from('5020aa01b064aed0a8654c0d1004d9006001', 'hex');
    const result = new Parser(buffer).parse();
    assert.deepEqual(result.capabilities, {
      connectable: 0,
      central: 0,
      secure: 1,
    });
  });

  it('should parse humidity and temperature data', () => {
    const buffer = Buffer.from('5020aa01b064aed0a8654c0d1004d9006001', 'hex');
    const result = new Parser(buffer).parse();
    assert.equal(result.eventType, 4109);
    assert.equal(result.event.temperature, 21.7);
    assert.equal(result.event.humidity, 35.2);
  });

  it('should parse temperature data', () => {
    const buffer = Buffer.from('5020aa01a664aed0a8654c041002d900', 'hex');
    const result = new Parser(buffer).parse();
    assert.equal(result.eventType, 4100);
    assert.equal(result.event.temperature, 21.7);
  });

  it('should parse humidity data', () => {
    const buffer = Buffer.from('5020aa01a164aed0a8654c0610025d01', 'hex');
    const result = new Parser(buffer).parse();
    assert.equal(result.eventType, 4102);
    assert.equal(result.event.humidity, 34.9);
  });

  it('should parse battery data', () => {
    const buffer = Buffer.from('5020aa014e65aed0a8654c0a10015d', 'hex');
    const result = new Parser(buffer).parse();

    assert.equal(result.eventType, 4106);
    assert.equal(result.event.battery, 93);
  });
});
