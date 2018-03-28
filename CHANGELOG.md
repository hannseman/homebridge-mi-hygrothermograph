# Changelog

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

* Better test coverage
* Pass peripheral id when emitting sensor events
* Only log when `DEBUG` is set 
