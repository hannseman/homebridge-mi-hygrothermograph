# homebridge-mi-hygrothermograph
[![NPM version](https://badge.fury.io/js/homebridge-weather.svg)](https://npmjs.org/package/homebridge-weather)

[Homebridge](https://github.com/nfarina/homebridge) plugin for exposing measured temperature and humidity from the Xiaomi Mi Bluetooth Temperature and Humidity Sensor as an [HomeKit](https://www.apple.com/ios/home/) accessory.

## Installation
Make sure your systems matches the prerequisites. You need to have a C compiler, [Node.js](https://nodejs.org/) server. [Noble](https://github.com/noble/noble) is BLE central module library for [Node.js](https://nodejs.org/) used to discover and read values from the hygrothermograph. 
 
Install `libbluetooth-dev` and `libavahi-compat-libdnssd-dev`

 These libraries and their dependencies are required by [Noble](https://www.npmjs.com/package/noble) package and provide access to the kernel Bluetooth subsystem.

```sh
sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev libavahi-compat-libdnssd-dev
```

For more detailed information and descriptions of other platforms please see the [Noble documentation](https://www.npmjs.com/package/noble#readme).
 
### Install homebridge and this library
```
npm install -g --unsafe-perm homebridge
npm install -g homebridge-mi-hygrothermograph
```

## Homebridge configuration

```json
"accessories": [
    {
      "accessory": "Hygrotermograph",
      "name": "Temperature & Humidity"
    }
]
```