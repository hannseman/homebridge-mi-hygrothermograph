# Changelog

## 3.0.2

* Update [noble](https://www.npmjs.com/package/@abandonware/noble) to 1.9.2-10.
* Moved some logging to the debug level.

## 3.0.1

* Update [noble](https://www.npmjs.com/package/@abandonware/noble) to 1.9.2-9.

## 3.0.0

* Added support for LYWSD03MMC and other models using encryption.
* Dropped support for Node < 10.

## 2.4.0

* Update [noble](https://www.npmjs.com/package/@abandonware/noble) to 1.9.2-5, which supports Node 12+.

## 2.3.2

* Add support for [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x).

## 2.3.1

* Add support for the MQTT `retain` publish option.
* Document iOS automations with Shortcuts.
* Update dependencies.


## 2.3.0

* Add support for setting temperature/humidity offsets.
* Add support for disabling battery level to disable warnings in Elgato Eve on newer E-Ink sensors.
* Upgrade MQTT.js to 3.0.0
* Warn when address is not set in config.

## 2.2.1

* Remove documentation about not supporting MacOS Mojave.
* Safer peripheral parsing when encountering invalid values.

## 2.2.0

* Add support for MacOS Mojave.

## 2.1.0

* Add support for batch updating values at defined intervals.
* Add support for configuring at what battery level the sensor should warn about low battery.

## 2.0.0

* Support for Node >= 10.
* Dropped support for Node < 8.6.0.

## 1.9.0

* Keep trying to scan for devices even when stopped by external party. This can be disabled by setting `forceDiscovering` to `false`.
* MQTT-configuration now supports all available MQTT.js client options
* Update dependencies.
* Better handling of default arguments.
* Better error logging related to parse errors.
* Make it clearer that Node <=10 is not supported at the moment due to issues in Noble.
* Make it clearer that MacOS Mojave is not supported.

## 1.8.0

* Add support for MacOS-style bluetooth addresses.

## 1.7.1

* More detailed logging.

## 1.7.0

* Add support for publishing temperature/humidity/battery values to MQTT topics.

## 1.6.0

* Correctly parse the MAC address as 48-bits.
* Extend parser to support data emitted by Mi Flora devices. Note that the data from these devices are not actually exposed to Homekit.
* General cleanup and refactoring.
* Updated dependencies.
* Use Prettier for linting.

## 1.5.0

* Add support for fakegato-history.
* Add option to disable timeouts.
* Package version is now reported on the Firmware characteristic.
* Invalid characters are stripped from Serial number characteristic for fakegato-history support.

## 1.4.0

* Use configured address as serial number. If no address is configured no serial number is exposed to Homekit.
* Log when accessory has timed out.
* Fully parse capability bits.
* Parse device version.
* Some code cleanup.


## 1.3.1

* Bugfix: Remove trailing commas from function calls to fix Node 6 support.
* Bugfix: Allow `address` specified in config.json to be both uppercase and lowercase.
* Run Node 6 tests on Travis CI.
* Add test for index.js.

## 1.3.0

* Mark devices as unreachable after a a treshold has been reached. Default 15 minutes. Can be configured by setting `timeout` in config.json.
* Allow customisation of temperature / humidity names which are exposed in the Home-app. Can be configured in config.json.
* Bugfix: Negative temperatures are now parsed for all events sent by the sensor.
* Bugfix: Start scanning after events have been bound on accessory.
* Better test coverage.
* Updates to README.

## 1.2.0

* Handle negative temperatures.
* Let sensor data initially be `undefined` to properly report connectivity errors on startup.
* Set `BatteryService.ChargingState` as `NOT_CHARGEABLE`.
* General code cleanup and extended tests.
* Make npm package smaller by specifying `files` in `package.json`.

## 1.1.1

* Expose Low Battery Characteristic.
* Better test coverage.

## 1.1.0

* Support multiple sensors by specifying BLE addresses.
* Remove dependency of binary-parser since it did not parse bitfields correctly.
* Better naming of fields returned by parser.

## 1.0.2

* Better test coverage.
* Pass peripheral id when emitting sensor events.
* Only log when `DEBUG` is set .
