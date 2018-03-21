const assert = require('assert');
const { describe, it, beforeEach } = require('mocha');
const noble = require('noble');
const sinon = require('sinon');
const { Scanner } = require('../lib/scanner');

const getPeripheral = event => ({
  id: '4c65a8d0ae65',
  address: '4c:65:a8:d0:ae:64',
  rssi: -67,
  advertisement: {
    localName: 'MJ_HT_V1',
    serviceData: [{
      uuid: 'fe95',
      data: event,
    }],
  },
});
const temperatureEvent = Buffer.from('5020aa01a664aed0a8654c041002d900', 'hex');
const humidityEvent = Buffer.from('5020aa01a164aed0a8654c0610025d01', 'hex');
const humidityAndTemperatureEvent = Buffer.from('5020aa01b064aed0a8654c0d1004d9006001', 'hex');
const batteryEvent = Buffer.from('5020aa014e65aed0a8654c0a10015d', 'hex');

describe('parser', () => {
  beforeEach(() => {
    const dummyLogger = { debug() { } };
    this.scanner = new Scanner(dummyLogger);
  });

  it('should discover temperature event', () => {
    const eventSpy = sinon.spy();
    this.scanner.on('temperatureChange', eventSpy);
    const peripheral = getPeripheral(temperatureEvent);
    noble.emit('discover', peripheral);
    assert(eventSpy.calledWith(21.7));
  });

  it('should discover humidity event', () => {
    const eventSpy = sinon.spy();
    this.scanner.on('humidityChange', eventSpy);
    const peripheral = getPeripheral(humidityEvent);
    noble.emit('discover', peripheral);
    assert(eventSpy.calledWith(34.9));
  });

  it('should discover humidity & temperature event', () => {
    const humidityEventSpy = sinon.spy();
    const temperatureEventSpy = sinon.spy();
    this.scanner.on('humidityChange', humidityEventSpy);
    this.scanner.on('temperatureChange', temperatureEventSpy);
    const peripheral = getPeripheral(humidityAndTemperatureEvent);
    noble.emit('discover', peripheral);
    assert(temperatureEventSpy.calledWith(21.7));
    assert(humidityEventSpy.calledWith(35.2));
  });

  it('should discover battery event', () => {
    const eventSpy = sinon.spy();
    this.scanner.on('batteryChange', eventSpy);
    const peripheral = getPeripheral(batteryEvent);
    noble.emit('discover', peripheral);
    assert(eventSpy.calledWith(93));
  });
});
