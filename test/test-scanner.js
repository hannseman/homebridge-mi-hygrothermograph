const assert = require('assert');
const {
  describe, it, beforeEach, afterEach,
} = require('mocha');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const {
  PeripheralMock, ParseMock, nobleMock, mockLogger,
} = require('./mocks');
const {
  EventTypes,
  SERVICE_DATA_UUID,
} = require('../lib/parser');


const { Scanner } = proxyquire('../lib/scanner', {
  noble: nobleMock,
});

describe('parser', () => {
  const sensorData = {
    temperatureAndHumidity: Buffer.from('5020aa01b064aed0a8654c0d1004d9006001', 'hex'),
    humidity: Buffer.from('5020aa01a164aed0a8654c0610025d01', 'hex'),
    temperature: Buffer.from('5020aa01a664aed0a8654c041002d900', 'hex'),
    battery: Buffer.from('5020aa014e64aed0a8654c0a10015d', 'hex'),
  };

  beforeEach(() => {
    this.scanner = new Scanner(mockLogger);
  });

  afterEach(() => {
    nobleMock.removeAllListeners();
  });

  it('should discover temperature event', () => {
    const eventSpy = sinon.spy();
    this.scanner.on('temperatureChange', eventSpy);
    const peripheral = new PeripheralMock(sensorData.temperature);
    nobleMock.emit('discover', peripheral);
    assert(eventSpy.calledWith(21.7));
  });

  it('should discover humidity event', () => {
    const eventSpy = sinon.spy();
    this.scanner.on('humidityChange', eventSpy);
    const peripheral = new PeripheralMock(sensorData.humidity);
    nobleMock.emit('discover', peripheral);
    assert(eventSpy.calledWith(34.9));
  });

  it('should discover humidity & temperature event', () => {
    const humidityEventSpy = sinon.spy();
    const temperatureEventSpy = sinon.spy();
    this.scanner.on('humidityChange', humidityEventSpy);
    this.scanner.on('temperatureChange', temperatureEventSpy);
    const peripheral = new PeripheralMock(sensorData.temperatureAndHumidity);
    nobleMock.emit('discover', peripheral);
    assert(temperatureEventSpy.calledWith(21.7));
    assert(humidityEventSpy.calledWith(35.2));
  });

  it('should discover battery event', () => {
    const eventSpy = sinon.spy();
    this.scanner.on('batteryChange', eventSpy);
    const peripheral = new PeripheralMock(sensorData.battery);
    nobleMock.emit('discover', peripheral);
    assert(eventSpy.calledWith(93));
  });

  it('should not discover all peripherals with defined address', () => {
    const eventSpy = sinon.spy();
    const wrongPeripheral = new PeripheralMock(sensorData.temperatureAndHumidity, 'cdb');
    const correctPeripheral = new PeripheralMock(sensorData.temperatureAndHumidity, 'abc');
    const scanner = new Scanner(mockLogger, 'ABC');
    scanner.on('temperatureChange', eventSpy);
    nobleMock.emit('discover', wrongPeripheral);
    assert(eventSpy.notCalled);
    nobleMock.emit('discover', correctPeripheral);
    assert(eventSpy.calledWith(21.7));
  });

  it('should discard wrongs uuids', () => {
    const eventSpy = sinon.spy();
    this.scanner.on('temperatureChange', eventSpy);
    const peripheral = new PeripheralMock(sensorData.temperature, '123', 'deadbeef');
    nobleMock.emit('discover', peripheral);
    assert(eventSpy.notCalled);
  });

  it('should handle parse errors', () => {
    const eventSpy = sinon.spy();
    this.scanner.on('temperatureChange', eventSpy);
    const peripheral = new PeripheralMock(Buffer.from('deadbeefed', 'hex'));
    assert.throws(() => nobleMock.emit('discover', peripheral));
  });

  it('should emit errors', () => {
    const eventSpy = sinon.spy();
    this.scanner.on('error', eventSpy);
    const peripheral = new PeripheralMock(Buffer.from('deadbeefed', 'hex'));
    nobleMock.emit('discover', peripheral);
    assert(eventSpy.calledWith(sinon.match.instanceOf(Error)));
  });

  it('should start scanning', () => {
    const startScanningStub = sinon.stub(nobleMock, 'startScanning');
    const stopScanningStub = sinon.stub(nobleMock, 'stopScanning');

    this.scanner.start();
    nobleMock.emit('stateChange', 'poweredOn');
    assert(startScanningStub.called);
    nobleMock.emit('stateChange', 'poweredOff');
    assert(stopScanningStub.called);
  });

  it('should handle unknown event type', () => {
    const mockedScanner = proxyquire('../lib/scanner', {
      noble: nobleMock,
      './parser': {
        Parser: ParseMock,
        SERVICE_DATA_UUID,
        EventTypes,
      },
    });
    const scanner = new mockedScanner.Scanner(mockLogger);
    scanner.start();
    const peripheral = new PeripheralMock(Buffer.from('5020aa01a164aed0a8654c0610025d01', 'hex'));
    assert.throws(() => nobleMock.emit('discover', peripheral), Error);
    const eventSpy = sinon.spy();
    scanner.on('error', eventSpy);
    nobleMock.emit('discover', peripheral);
    assert(eventSpy.calledWith(sinon.match.instanceOf(Error)));
  });
});
