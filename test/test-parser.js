const assert = require('assert');
const { describe, it } = require('mocha');
const { Parser } = require('../lib/parser');

describe('parser', () => {
  const sensorData = {
    temperatureAndHumidity: Buffer.from('5020aa01b064aed0a8654c0d1004d9006001', 'hex'),
    humidity: Buffer.from('5020aa01a164aed0a8654c0610025d01', 'hex'),
    temperature: Buffer.from('5020aa01a664aed0a8654c041002d900', 'hex'),
    battery: Buffer.from('5020aa014e64aed0a8654c0a10015d', 'hex'),
  };
  Object.keys(sensorData).forEach((sensorKey) => {
    it('should parse frame control', () => {
      const result = new Parser(sensorData[sensorKey]).parse();
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
  });

  Object.keys(sensorData).forEach((sensorKey) => {
    it('should parse product id', () => {
      const result = new Parser(sensorData[sensorKey]).parse();
      assert.equal(result.productId, 426);
    });
  });

  it('should parse frame counter', () => {
    const result = new Parser(sensorData.temperatureAndHumidity).parse();
    assert.equal(result.frameCounter, 176);
  });

  it('should parse frame counter', () => {
    const result = new Parser(sensorData.temperature).parse();
    assert.equal(result.frameCounter, 166);
  });

  it('should parse frame counter', () => {
    const result = new Parser(sensorData.humidity).parse();
    assert.equal(result.frameCounter, 161);
  });

  it('should parse frame counter', () => {
    const result = new Parser(sensorData.battery).parse();
    assert.equal(result.frameCounter, 78);
  });

  Object.keys(sensorData).forEach((sensorKey) => {
    it('should parse macAddress', () => {
      const result = new Parser(sensorData[sensorKey]).parse();
      assert.equal(result.macAddress, '64aed0a865');
    });
  });

  Object.keys(sensorData).forEach((sensorKey) => {
    it('should parse capabilities', () => {
      const result = new Parser(sensorData[sensorKey]).parse();
      assert.deepEqual(result.capabilities, {
        connectable: 0,
        central: 0,
        secure: 1,
      });
    });
  });

  it('should parse humidity and temperature data', () => {
    const result = new Parser(sensorData.temperatureAndHumidity).parse();
    assert.equal(result.eventType, 4109);
    assert.equal(result.eventLength, 4);
    assert.equal(result.event.temperature, 21.7);
    assert.equal(result.event.humidity, 35.2);
  });

  it('should parse temperature data', () => {
    const buffer = Buffer.from(sensorData.temperature, 'hex');
    const result = new Parser(buffer).parse();
    assert.equal(result.eventType, 4100);
    assert.equal(result.eventLength, 2);
    assert.equal(result.event.temperature, 21.7);
  });

  it('should parse humidity data', () => {
    const buffer = Buffer.from(sensorData.humidity, 'hex');
    const result = new Parser(buffer).parse();
    assert.equal(result.eventType, 4102);
    assert.equal(result.eventLength, 2);
    assert.equal(result.event.humidity, 34.9);
  });

  it('should parse battery data', () => {
    const buffer = Buffer.from(sensorData.battery, 'hex');
    const result = new Parser(buffer).parse();
    assert.equal(result.eventType, 4106);
    assert.equal(result.eventLength, 1);
    assert.equal(result.event.battery, 93);
  });

  it('should parse fail on too short', () => {
    const buffer = Buffer.from('5020', 'hex');
    assert.throws(() => new Parser(buffer), Error);
  });

  it('should parse fail on invalid eventtype', () => {
    const buffer = Buffer.from('5020aa014e64aed0a8654c0a11015d', 'hex');
    assert.throws(() => new Parser(buffer).parse(), Error);
  });
});
