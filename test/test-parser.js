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
      assert.deepStrictEqual(result.frameControl, {
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
      assert.strictEqual(result.productId, 426);
    });
  });

  it('should parse frame counter', () => {
    const result = new Parser(sensorData.temperatureAndHumidity).parse();
    assert.strictEqual(result.frameCounter, 176);
  });

  it('should parse frame counter', () => {
    const result = new Parser(sensorData.temperature).parse();
    assert.strictEqual(result.frameCounter, 166);
  });

  it('should parse frame counter', () => {
    const result = new Parser(sensorData.humidity).parse();
    assert.strictEqual(result.frameCounter, 161);
  });

  it('should parse frame counter', () => {
    const result = new Parser(sensorData.battery).parse();
    assert.strictEqual(result.frameCounter, 78);
  });

  Object.keys(sensorData).forEach((sensorKey) => {
    it('should parse macAddress', () => {
      const result = new Parser(sensorData[sensorKey]).parse();
      assert.strictEqual(result.macAddress, '64aed0a865');
    });
  });

  Object.keys(sensorData).forEach((sensorKey) => {
    it('should parse capabilities', () => {
      const result = new Parser(sensorData[sensorKey]).parse();
      assert.deepStrictEqual(result.capabilities, {
        connectable: false,
        central: false,
        secure: true,
      });
    });
  });

  it('should parse humidity and temperature data', () => {
    const result = new Parser(sensorData.temperatureAndHumidity).parse();
    assert.strictEqual(result.eventType, 4109);
    assert.strictEqual(result.eventLength, 4);
    assert.strictEqual(result.event.temperature, 21.7);
    assert.strictEqual(result.event.humidity, 35.2);
  });

  it('should parse temperature data', () => {
    const buffer = Buffer.from(sensorData.temperature, 'hex');
    const result = new Parser(buffer).parse();
    assert.strictEqual(result.eventType, 4100);
    assert.strictEqual(result.eventLength, 2);
    assert.strictEqual(result.event.temperature, 21.7);
  });

  it('should parse humidity data', () => {
    const buffer = Buffer.from(sensorData.humidity, 'hex');
    const result = new Parser(buffer).parse();
    assert.strictEqual(result.eventType, 4102);
    assert.strictEqual(result.eventLength, 2);
    assert.strictEqual(result.event.humidity, 34.9);
  });

  it('should parse battery data', () => {
    const buffer = Buffer.from(sensorData.battery, 'hex');
    const result = new Parser(buffer).parse();
    assert.strictEqual(result.eventType, 4106);
    assert.strictEqual(result.eventLength, 1);
    assert.strictEqual(result.event.battery, 93);
  });

  it('should parse fail on too short', () => {
    const buffer = Buffer.from('5020', 'hex');
    assert.throws(() => new Parser(buffer), Error);
  });

  it('should parse fail on invalid eventtype', () => {
    const buffer = Buffer.from('5020aa014e64aed0a8654c0a11015d', 'hex');
    assert.throws(() => new Parser(buffer).parse(), Error);
  });

  it('should parse negative temperature for temperature event', () => {
    const buffer = Buffer.from('5020aa01a664aed0a8654c04100285FF', 'hex');
    const result = new Parser(buffer).parse();
    assert.strictEqual(result.eventType, 4100);
    assert.strictEqual(result.eventLength, 2);
    assert.strictEqual(result.event.temperature, -12.3);
  });

  it('should parse negative temperature for temperature & humdity event', () => {
    const buffer = Buffer.from('5020aa01b064aed0a8654c0d100485FF6001', 'hex');
    const result = new Parser(buffer).parse();
    assert.strictEqual(result.eventType, 4109);
    assert.strictEqual(result.eventLength, 4);
    assert.strictEqual(result.event.temperature, -12.3);
    assert.strictEqual(result.event.humidity, 35.2);
  });


  it('should handle missing capabilities', () => {
    const buffer = Buffer.from('5010aa01a664aed0a865041002d900', 'hex');
    const result = new Parser(buffer).parse();
    assert.deepStrictEqual(result.frameControl, {
      isFactoryNew: false,
      isConnected: false,
      isCentral: false,
      isEncrypted: false,
      hasMacAddress: true,
      hasCapabilities: false,
      hasEvent: true,
      hasCustomData: false,
      hasSubtitle: false,
      hasBinding: false,
    });
    assert.strictEqual(result.capabilities, null);
    assert.strictEqual(result.macAddress, '64aed0a865');
    assert.strictEqual(result.eventType, 4100);
  });

  it('should handle missing mac address', () => {
    const buffer = Buffer.from('4020aa01a64c041002d900', 'hex');
    const result = new Parser(buffer).parse();
    assert.deepStrictEqual(result.frameControl, {
      isFactoryNew: false,
      isConnected: false,
      isCentral: false,
      isEncrypted: false,
      hasMacAddress: false,
      hasCapabilities: true,
      hasEvent: true,
      hasCustomData: false,
      hasSubtitle: false,
      hasBinding: false,
    });
    assert.strictEqual(result.macAddress, null);
    assert.deepStrictEqual(result.capabilities, {
      connectable: false,
      central: false,
      secure: true,
    });
    assert.strictEqual(result.eventLength, 2);
    assert.strictEqual(result.eventType, 4100);
  });

  it('should handle missing event', () => {
    const buffer = Buffer.from('1020aa01a664aed0a8654c04', 'hex');
    const result = new Parser(buffer).parse();
    assert.deepStrictEqual(result.frameControl, {
      isFactoryNew: false,
      isConnected: false,
      isCentral: false,
      isEncrypted: false,
      hasMacAddress: true,
      hasCapabilities: true,
      hasEvent: false,
      hasCustomData: false,
      hasSubtitle: false,
      hasBinding: false,
    });
    assert.strictEqual(result.eventType, null);
    assert.strictEqual(result.eventLength, null);
    assert.strictEqual(result.event, null);
  });
});
