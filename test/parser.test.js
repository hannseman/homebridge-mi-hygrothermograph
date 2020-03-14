const assert = require("assert");
const { describe, it } = require("mocha");
const { Parser } = require("../lib/parser");

describe("parser", () => {
  const isFlora = key => ["illuminance", "moisture", "fertility"].includes(key);
  const sensorData = {
    temperatureAndHumidity: Buffer.from(
      "5020aa01b064aed0a8654c0d1004d9006001",
      "hex"
    ),
    humidity: Buffer.from("5020aa01a164aed0a8654c0610025d01", "hex"),
    temperature: Buffer.from("5020aa01a664aed0a8654c041002d900", "hex"),
    battery: Buffer.from("5020aa014e64aed0a8654c0a10015d", "hex"),
    illuminance: Buffer.from("71209800a764aed0a8654c0d0710030e0000", "hex"),
    moisture: Buffer.from("71209800a864aed0a8654c0d08100112", "hex"),
    fertility: Buffer.from("71209800a564aed0a8654c0d091002b800", "hex")
  };
  const sensorDataCrypted = {
    humidity: Buffer.from(
      "58585b05db184bf838c1a472c3fa42cd050000ce7b8a28",
      "hex"
    )
  };
  Object.keys(sensorData).forEach(sensorKey => {
    it("should parse frame control", () => {
      const result = new Parser(sensorData[sensorKey]).parse();
      assert.deepStrictEqual(result.frameControl, {
        isFactoryNew: isFlora(sensorKey),
        isConnected: false,
        isCentral: false,
        isEncrypted: false,
        hasMacAddress: true,
        hasCapabilities: isFlora(sensorKey),
        hasEvent: true,
        hasCustomData: false,
        hasSubtitle: false,
        hasBinding: false
      });
    });
  });

  Object.keys(sensorData).forEach(sensorKey => {
    it("should parse version", () => {
      const result = new Parser(sensorData[sensorKey]).parse();
      assert.strictEqual(result.version, 2);
    });

    it("should parse product id", () => {
      const result = new Parser(sensorData[sensorKey]).parse();
      assert.strictEqual(result.productId, isFlora(sensorKey) ? 152 : 426);
    });
  });

  it("should parse frame counter", () => {
    const result = new Parser(sensorData.temperatureAndHumidity).parse();
    assert.strictEqual(result.frameCounter, 176);
  });

  it("should parse frame counter", () => {
    const result = new Parser(sensorData.temperature).parse();
    assert.strictEqual(result.frameCounter, 166);
  });

  it("should parse frame counter", () => {
    const result = new Parser(sensorData.humidity).parse();
    assert.strictEqual(result.frameCounter, 161);
  });

  it("should parse frame counter", () => {
    const result = new Parser(sensorData.battery).parse();
    assert.strictEqual(result.frameCounter, 78);
  });

  Object.keys(sensorData).forEach(sensorKey => {
    it("should parse macAddress", () => {
      const result = new Parser(sensorData[sensorKey]).parse();
      assert.strictEqual(Buffer.from(result.macAddress, "hex").length, 6);
      assert.strictEqual(result.macAddress, "4c65a8d0ae64");
    });
  });

  Object.keys(sensorData)
    .filter(key => isFlora(key))
    .forEach(sensorKey => {
      it("should parse capabilities", () => {
        const result = new Parser(sensorData[sensorKey]).parse();
        assert.deepStrictEqual(result.capabilities, {
          connectable: true,
          central: false,
          secure: true,
          io: true
        });
      });
    });

  it("should parse humidity and temperature data", () => {
    const result = new Parser(sensorData.temperatureAndHumidity).parse();
    assert.strictEqual(result.eventType, 4109);
    assert.strictEqual(result.eventLength, 4);
    assert.strictEqual(result.event.temperature, 21.7);
    assert.strictEqual(result.event.humidity, 35.2);
  });

  it("should parse temperature data", () => {
    const buffer = Buffer.from(sensorData.temperature, "hex");
    const result = new Parser(buffer).parse();
    assert.strictEqual(result.eventType, 4100);
    assert.strictEqual(result.eventLength, 2);
    assert.strictEqual(result.event.temperature, 21.7);
  });

  it("should parse humidity data", () => {
    const buffer = Buffer.from(sensorData.humidity, "hex");
    const result = new Parser(buffer).parse();
    assert.strictEqual(result.eventType, 4102);
    assert.strictEqual(result.eventLength, 2);
    assert.strictEqual(result.event.humidity, 34.9);
  });

  it("should parse humidity data from crypted", () => {
    const buffer = Buffer.from(sensorDataCrypted.humidity, "hex");
    const result = new Parser(
      buffer,
      "B2D46F0CD168C18B247C0C79E9AD5B8D"
    ).parse();
    assert.strictEqual(result.eventType, 4102);
    assert.strictEqual(result.eventLength, 2);
    assert.strictEqual(result.event.humidity, 43.9);
  });

  it("should throw on encrypted data without bindKey", () => {
    const buffer = Buffer.from(sensorDataCrypted.humidity, "hex");
    assert.throws(
      () => new Parser(buffer, null).parse(),
      /^Error: Sensor data is encrypted. Please configure a bindKey.$/
    );
  });

  it("should parse battery data", () => {
    const buffer = Buffer.from(sensorData.battery, "hex");
    const result = new Parser(buffer).parse();
    assert.strictEqual(result.eventType, 4106);
    assert.strictEqual(result.eventLength, 1);
    assert.strictEqual(result.event.battery, 93);
  });

  it("should parse moisture data", () => {
    const buffer = Buffer.from(sensorData.moisture, "hex");
    const result = new Parser(buffer).parse();
    assert.strictEqual(result.eventType, 4104);
    assert.strictEqual(result.eventLength, 1);
    assert.strictEqual(result.event.moisture, 18);
  });

  it("should parse illuminance data", () => {
    const buffer = Buffer.from(sensorData.illuminance, "hex");
    const result = new Parser(buffer).parse();
    assert.strictEqual(result.eventType, 4103);
    assert.strictEqual(result.eventLength, 3);
    assert.strictEqual(result.event.illuminance, 14);
  });

  it("should parse fertility data", () => {
    const buffer = Buffer.from(sensorData.fertility, "hex");
    const result = new Parser(buffer).parse();
    assert.strictEqual(result.eventType, 4105);
    assert.strictEqual(result.eventLength, 2);
    assert.strictEqual(result.event.fertility, 184);
  });

  it("should parse fail on too short", () => {
    const buffer = Buffer.from("5020", "hex");
    assert.throws(() => new Parser(buffer), Error);
  });

  it("should parse fail on missing buffer", () => {
    assert.throws(() => new Parser(), Error);
  });

  it("should parse fail on invalid eventtype", () => {
    const buffer = Buffer.from("5020aa014e64aed0a8654c0a11015d", "hex");
    assert.throws(() => new Parser(buffer).parse(), Error);
  });

  it("should parse negative temperature for temperature event", () => {
    const buffer = Buffer.from("5020aa01a664aed0a8654c04100285FF", "hex");
    const result = new Parser(buffer).parse();
    assert.strictEqual(result.eventType, 4100);
    assert.strictEqual(result.eventLength, 2);
    assert.strictEqual(result.event.temperature, -12.3);
  });

  it("should parse negative temperature for temperature & humdity event", () => {
    const buffer = Buffer.from("5020aa01b064aed0a8654c0d100485FF6001", "hex");
    const result = new Parser(buffer).parse();
    assert.strictEqual(result.eventType, 4109);
    assert.strictEqual(result.eventLength, 4);
    assert.strictEqual(result.event.temperature, -12.3);
    assert.strictEqual(result.event.humidity, 35.2);
  });

  it("should handle missing capabilities", () => {
    const buffer = Buffer.from("5020aa01b064aed0a8654c0d100485FF6001", "hex");
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
      hasBinding: false
    });
    assert.strictEqual(result.capabilities, null);
    assert.strictEqual(result.macAddress, "4c65a8d0ae64");
    assert.strictEqual(result.eventType, 4109);
  });

  it("should handle missing mac address", () => {
    const buffer = Buffer.from("60209800a80d08100112", "hex");
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
      hasBinding: false
    });
    assert.strictEqual(result.macAddress, null);
    assert.strictEqual(result.eventLength, 1);
    assert.strictEqual(result.eventType, 4104);
  });

  it("should handle missing event", () => {
    const buffer = Buffer.from("1020aa01a664aed0a8654c04", "hex");
    const result = new Parser(buffer).parse();
    assert.deepStrictEqual(result.frameControl, {
      isFactoryNew: false,
      isConnected: false,
      isCentral: false,
      isEncrypted: false,
      hasMacAddress: true,
      hasCapabilities: false,
      hasEvent: false,
      hasCustomData: false,
      hasSubtitle: false,
      hasBinding: false
    });
    assert.strictEqual(result.eventType, null);
    assert.strictEqual(result.eventLength, null);
    assert.strictEqual(result.event, null);
  });
});
