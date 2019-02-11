const assert = require("assert");
const { describe, it, beforeEach, afterEach } = require("mocha");
const proxyquire = require("proxyquire").noCallThru();
const sinon = require("sinon");
const { PeripheralMock, ParseMock, nobleMock, mockLogger } = require("./mocks");
const { EventTypes, SERVICE_DATA_UUID } = require("../lib/parser");

const { Scanner } = proxyquire("../lib/scanner", {
  "@abandonware/noble": nobleMock
});

describe("scanner", () => {
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

  beforeEach(() => {
    this.scanner = new Scanner(null, { log: mockLogger });
  });

  afterEach(() => {
    nobleMock.removeAllListeners();
    sinon.restore();
  });

  it("should discover temperature event", () => {
    const temperatureEventSpy = sinon.spy();
    const changeEventSpy = sinon.spy();
    this.scanner.on("temperatureChange", temperatureEventSpy);
    this.scanner.on("change", changeEventSpy);
    const peripheral = new PeripheralMock(sensorData.temperature);
    nobleMock.emit("discover", peripheral);
    assert(temperatureEventSpy.calledWith(21.7));
    assert(changeEventSpy.called);
  });

  it("should discover humidity event", () => {
    const humidityEventSpy = sinon.spy();
    const changeEventSpy = sinon.spy();
    this.scanner.on("humidityChange", humidityEventSpy);
    this.scanner.on("change", changeEventSpy);
    const peripheral = new PeripheralMock(sensorData.humidity);
    nobleMock.emit("discover", peripheral);
    assert(humidityEventSpy.calledWith(34.9));
    assert(changeEventSpy.called);
  });

  it("should discover humidity & temperature event", () => {
    const humidityEventSpy = sinon.spy();
    const temperatureEventSpy = sinon.spy();
    const changeEventSpy = sinon.spy();
    this.scanner.on("humidityChange", humidityEventSpy);
    this.scanner.on("temperatureChange", temperatureEventSpy);
    this.scanner.on("change", changeEventSpy);
    const peripheral = new PeripheralMock(sensorData.temperatureAndHumidity);
    nobleMock.emit("discover", peripheral);
    assert(temperatureEventSpy.calledWith(21.7));
    assert(humidityEventSpy.calledWith(35.2));
    assert(changeEventSpy.called);
  });

  it("should discover battery event", () => {
    const batteryEventSpy = sinon.spy();
    const changeEventSpy = sinon.spy();
    this.scanner.on("batteryChange", batteryEventSpy);
    this.scanner.on("change", changeEventSpy);
    const peripheral = new PeripheralMock(sensorData.battery);
    nobleMock.emit("discover", peripheral);
    assert(batteryEventSpy.calledWith(93));
    assert(changeEventSpy.called);
  });

  it("should discover illuminance event", () => {
    const illuminanceEventSpy = sinon.spy();
    const changeEventSpy = sinon.spy();
    this.scanner.on("illuminanceChange", illuminanceEventSpy);
    this.scanner.on("change", changeEventSpy);
    const peripheral = new PeripheralMock(sensorData.illuminance);
    nobleMock.emit("discover", peripheral);
    assert(illuminanceEventSpy.calledWith(14));
    assert(changeEventSpy.called);
  });

  it("should discover moisture event", () => {
    const moistureEventSpy = sinon.spy();
    const changeEventSpy = sinon.spy();
    this.scanner.on("moistureChange", moistureEventSpy);
    this.scanner.on("change", changeEventSpy);
    const peripheral = new PeripheralMock(sensorData.moisture);
    nobleMock.emit("discover", peripheral);
    assert(moistureEventSpy.calledWith(18));
    assert(changeEventSpy.called);
  });

  it("should discover fertility event", () => {
    const fertilityEventSpy = sinon.spy();
    const changeEventSpy = sinon.spy();
    this.scanner.on("fertilityChange", fertilityEventSpy);
    this.scanner.on("change", changeEventSpy);
    const peripheral = new PeripheralMock(sensorData.fertility);
    nobleMock.emit("discover", peripheral);
    assert(fertilityEventSpy.calledWith(184));
    assert(changeEventSpy.called);
  });

  it("should not discover all peripherals with defined address", () => {
    const eventSpy = sinon.spy();
    const wrongPeripheral = new PeripheralMock(
      sensorData.temperatureAndHumidity,
      "cdb"
    );
    const correctPeripheral = new PeripheralMock(
      sensorData.temperatureAndHumidity,
      "abc"
    );
    const scanner = new Scanner("ABC", { log: mockLogger });
    scanner.on("temperatureChange", eventSpy);
    nobleMock.emit("discover", wrongPeripheral);
    assert(eventSpy.notCalled);
    nobleMock.emit("discover", correctPeripheral);
    assert(eventSpy.calledWith(21.7));
  });

  it("should discover peripherals with matching id", () => {
    const eventSpy = sinon.spy();
    const uuid = "f4f7f9907f7c4d5a8c9f8c264e9baa7d";
    const wrongPeripheral = new PeripheralMock(
      sensorData.temperatureAndHumidity,
      "unknown",
      "a09e0b69-0742-4353-b7e7-653fa4f2993b"
    );
    const correctPeripheral = new PeripheralMock(
      sensorData.temperatureAndHumidity,
      "unknown",
      uuid
    );
    const scanner = new Scanner("f4f7f990-7f7c-4d5a-8c9f-8c264e9baa7d", {
      log: mockLogger
    });
    scanner.on("temperatureChange", eventSpy);
    nobleMock.emit("discover", wrongPeripheral);
    assert(eventSpy.notCalled);
    nobleMock.emit("discover", correctPeripheral);
    assert(eventSpy.calledWith(21.7));
  });

  it("should discard wrongs uuids", () => {
    const eventSpy = sinon.spy();
    this.scanner.on("temperatureChange", eventSpy);
    const peripheral = new PeripheralMock(
      sensorData.temperature,
      "123",
      "123",
      "deadbeef"
    );
    nobleMock.emit("discover", peripheral);
    assert(eventSpy.notCalled);
  });

  it("should handle parse errors", () => {
    const eventSpy = sinon.spy();
    this.scanner.on("temperatureChange", eventSpy);
    const peripheral = new PeripheralMock(Buffer.from("deadbeefed", "hex"));
    assert.throws(() => nobleMock.emit("discover", peripheral));
  });

  it("should emit errors", () => {
    const errorEventSpy = sinon.spy();
    const changeEventSpy = sinon.spy();
    this.scanner.on("error", errorEventSpy);
    this.scanner.on("change", changeEventSpy);
    const peripheral = new PeripheralMock(Buffer.from("deadbeefed", "hex"));
    nobleMock.emit("discover", peripheral);
    assert(errorEventSpy.calledWith(sinon.match.instanceOf(Error)));
    assert(changeEventSpy.called === false);
  });

  it("should start scanning", () => {
    const startScanningStub = sinon.stub(nobleMock, "startScanning");
    const stopScanningStub = sinon.stub(nobleMock, "stopScanning");

    nobleMock.emit("stateChange", "poweredOn");
    assert(this.scanner.scanning);
    assert(startScanningStub.called);
    nobleMock.emit("stateChange", "poweredOff");
    assert(stopScanningStub.called);
    assert(this.scanner.scanning === false);
  });

  it("should handle error on startScanning", () => {
    const startScanningStub = sinon.stub(nobleMock, "startScanning");
    startScanningStub.throws("error");
    nobleMock.emit("stateChange", "poweredOn");
    assert(startScanningStub.called);
    assert(this.scanner.scanning === false);
  });

  it("should handle unknown event type", () => {
    const mockedScanner = proxyquire("../lib/scanner", {
      "@abandonware/noble": nobleMock,
      "./parser": {
        Parser: ParseMock,
        SERVICE_DATA_UUID,
        EventTypes
      }
    });
    const scanner = new mockedScanner.Scanner(null, { log: mockLogger });
    const peripheral = new PeripheralMock(
      Buffer.from("5020aa01a164aed0a8654c0610025d01", "hex")
    );
    assert.throws(() => nobleMock.emit("discover", peripheral), Error);
    const errorEventSpy = sinon.spy();
    const changeEventSpy = sinon.spy();
    scanner.on("error", errorEventSpy);
    scanner.on("change", changeEventSpy);
    nobleMock.emit("discover", peripheral);
    assert(errorEventSpy.calledWith(sinon.match.instanceOf(Error)));
    assert(changeEventSpy.called === false);
  });

  it("should log on scanStart", () => {
    const spyDebugLogger = sinon.spy(mockLogger, "debug");
    new Scanner("ABC", { log: mockLogger });
    nobleMock.emit("scanStart");
    assert(spyDebugLogger.called);
  });

  it("should log on scanStop", () => {
    const spyInfoLogger = sinon.spy(mockLogger, "info");
    new Scanner("ABC", { log: mockLogger });
    nobleMock.emit("scanStop");
    assert(spyInfoLogger.called);
  });

  it("should log on warning", () => {
    const spyInfoLogger = sinon.spy(mockLogger, "info");
    new Scanner("ABC", { log: mockLogger });
    nobleMock.emit("warning", "some warning");
    assert(spyInfoLogger.called);
  });

  it("should clean addresses", () => {
    const address = "de:ad:be:ef";
    const scanner = new Scanner(address, { log: mockLogger });
    assert.deepEqual(scanner.cleanAddress(scanner.address), "deadbeef");
    assert.deepEqual(
      scanner.cleanAddress("F4F7F990-7F7C-4D5A-8C9F-8C264E9BAA7D"),
      "f4f7f9907f7c4d5a8c9f8c264e9baa7d"
    );
  });

  it("should retry on scanStop when forceDiscovering is true", () => {
    const clock = sinon.useFakeTimers();
    const scanner = new Scanner("de:ad:be:ef", {
      log: mockLogger,
      forceDiscovering: true
    });
    nobleMock.emit("stateChange", "poweredOn");
    const startSpy = sinon.spy(scanner, "start");
    nobleMock.emit("scanStop");
    clock.tick(5001);
    assert(startSpy.called);
  });

  it("should not retry on scanStop when forceDiscovering is false", () => {
    const clock = sinon.useFakeTimers();
    const scanner = new Scanner("de:ad:be:ef", {
      log: mockLogger,
      forceDiscovering: false
    });
    nobleMock.emit("stateChange", "poweredOn");
    const startSpy = sinon.spy(scanner, "start");
    nobleMock.emit("scanStop");
    clock.tick(scanner.restartDelay + 1);
    assert(startSpy.notCalled);
  });

  it("should default logger to console.log", () => {
    const scanner = new Scanner("de:ad:be:ef");
    assert.strictEqual(scanner.log, console);
  });
});
