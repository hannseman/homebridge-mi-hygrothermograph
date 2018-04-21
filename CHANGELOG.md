# Changelog

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
