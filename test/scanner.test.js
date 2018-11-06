const assert = require("assert");
const { describe, it, beforeEach, afterEach } = require("mocha");
const proxyquire = require("proxyquire").noCallThru();
const sinon = require("sinon");
const { PeripheralMock, ParseMock, nobleMock, mockLogger } = require("./mocks");
const { EventTypes, SERVICE_DATA_UUID } = require("../lib/parser");

const { Scanner } = proxyquire("../lib/scanner", {
  noble: nobleMock
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
    this.scanner = new Scanner(mockLogger);
  });

  afterEach(() => {
    nobleMock.removeAllListeners();
  });

  it("should discover temperature event", () => {
    const eventSpy = sinon.spy();
    this.scanner.on("temperatureChange", eventSpy);
    const peripheral = new PeripheralMock(sensorData.temperature);
    nobleMock.emit("discover", peripheral);
    assert(eventSpy.calledWith(21.7));
  });

  it("should discover humidity event", () => {
    const eventSpy = sinon.spy();
    this.scanner.on("humidityChange", eventSpy);
    const peripheral = new PeripheralMock(sensorData.humidity);
    nobleMock.emit("discover", peripheral);
    assert(eventSpy.calledWith(34.9));
  });

  it("should discover humidity & temperature event", () => {
    const humidityEventSpy = sinon.spy();
    const temperatureEventSpy = sinon.spy();
    this.scanner.on("humidityChange", humidityEventSpy);
    this.scanner.on("temperatureChange", temperatureEventSpy);
    const peripheral = new PeripheralMock(sensorData.temperatureAndHumidity);
    nobleMock.emit("discover", peripheral);
    assert(temperatureEventSpy.calledWith(21.7));
    assert(humidityEventSpy.calledWith(35.2));
  });

  it("should discover battery event", () => {
    const eventSpy = sinon.spy();
    this.scanner.on("batteryChange", eventSpy);
    const peripheral = new PeripheralMock(sensorData.battery);
    nobleMock.emit("discover", peripheral);
    assert(eventSpy.calledWith(93));
  });

  it("should discover illuminance event", () => {
    const eventSpy = sinon.spy();
    this.scanner.on("illuminanceChange", eventSpy);
    const peripheral = new PeripheralMock(sensorData.illuminance);
    nobleMock.emit("discover", peripheral);
    assert(eventSpy.calledWith(14));
  });

  it("should discover moisture event", () => {
    const eventSpy = sinon.spy();
    this.scanner.on("moistureChange", eventSpy);
    const peripheral = new PeripheralMock(sensorData.moisture);
    nobleMock.emit("discover", peripheral);
    assert(eventSpy.calledWith(18));
  });

  it("should discover fertility event", () => {
    const eventSpy = sinon.spy();
    this.scanner.on("fertilityChange", eventSpy);
    const peripheral = new PeripheralMock(sensorData.fertility);
    nobleMock.emit("discover", peripheral);
    assert(eventSpy.calledWith(184));
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
    const scanner = new Scanner(mockLogger, "ABC");
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
    const scanner = new Scanner(
      mockLogger,
      "f4f7f990-7f7c-4d5a-8c9f-8c264e9baa7d"
    );
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
    const eventSpy = sinon.spy();
    this.scanner.on("error", eventSpy);
    const peripheral = new PeripheralMock(Buffer.from("deadbeefed", "hex"));
    nobleMock.emit("discover", peripheral);
    assert(eventSpy.calledWith(sinon.match.instanceOf(Error)));
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
    startScanningStub.restore();
    stopScanningStub.restore();
  });

  it("should handle error on startScanning", () => {
    const startScanningStub = sinon.stub(nobleMock, "startScanning");
    startScanningStub.throws("error");
    nobleMock.emit("stateChange", "poweredOn");
    assert(startScanningStub.called);
    assert(this.scanner.scanning === false);
    startScanningStub.restore();
  });

  it("should handle unknown event type", () => {
    const mockedScanner = proxyquire("../lib/scanner", {
      noble: nobleMock,
      "./parser": {
        Parser: ParseMock,
        SERVICE_DATA_UUID,
        EventTypes
      }
    });
    const scanner = new mockedScanner.Scanner(mockLogger);
    const peripheral = new PeripheralMock(
      Buffer.from("5020aa01a164aed0a8654c0610025d01", "hex")
    );
    assert.throws(() => nobleMock.emit("discover", peripheral), Error);
    const eventSpy = sinon.spy();
    scanner.on("error", eventSpy);
    nobleMock.emit("discover", peripheral);
    assert(eventSpy.calledWith(sinon.match.instanceOf(Error)));
  });

  it("should log on scanStart", () => {
    const spyDebugLogger = sinon.spy(mockLogger, "debug");
    new Scanner(mockLogger, "ABC");
    nobleMock.emit("scanStart");
    assert(spyDebugLogger.called);
    spyDebugLogger.restore();
  });

  it("should log on scanStop", () => {
    const spyInfoLogger = sinon.spy(mockLogger, "info");
    new Scanner(mockLogger, "ABC");
    nobleMock.emit("scanStop");
    assert(spyInfoLogger.called);
    spyInfoLogger.restore();
  });

  it("should log on warning", () => {
    const spyInfoLogger = sinon.spy(mockLogger, "info");
    new Scanner(mockLogger, "ABC");
    nobleMock.emit("warning", "some warning");
    assert(spyInfoLogger.called);
    spyInfoLogger.restore();
  });

  it("should clean addresses", () => {
    const address = "de:ad:be:ef";
    const scanner = new Scanner(mockLogger, address);
    assert.deepEqual(scanner.cleanAddress(scanner.address), "deadbeef");
    assert.deepEqual(
      scanner.cleanAddress("F4F7F990-7F7C-4D5A-8C9F-8C264E9BAA7D"),
      "f4f7f9907f7c4d5a8c9f8c264e9baa7d"
    );
  });

  it("should retry on scanStop when forceDiscovering is true", () => {
    const clock = sinon.useFakeTimers();
    const startScanningStub = sinon.stub(nobleMock, "startScanning");
    const scanner = new Scanner(mockLogger, "de:ad:be:ef", true);
    nobleMock.emit("stateChange", "poweredOn");
    const startSpy = sinon.spy(scanner, "start");
    nobleMock.emit("scanStop");
    clock.tick(5001);
    assert(startSpy.called);
    startSpy.restore();
    clock.restore();
    startScanningStub.restore();
  });

  it("should not retry on scanStop when forceDiscovering is false", () => {
    const clock = sinon.useFakeTimers();
    const scanner = new Scanner(mockLogger, "de:ad:be:ef", false);
    nobleMock.emit("stateChange", "poweredOn");
    const startSpy = sinon.spy(scanner, "start");
    nobleMock.emit("scanStop");
    clock.tick(scanner.restartDelay + 1);
    assert(startSpy.notCalled);
    startSpy.restore();
    clock.restore();
  });
});
