# homebridge-mi-hygrothermograph
[![npm](https://img.shields.io/npm/v/homebridge-mi-hygrothermograph.svg)](https://www.npmjs.com/package/homebridge-mi-hygrothermograph) [![Travis](https://img.shields.io/travis/hannseman/homebridge-mi-hygrothermograph.svg)](https://travis-ci.org/hannseman/homebridge-mi-hygrothermograph) [![Coveralls github](https://img.shields.io/coveralls/github/hannseman/homebridge-mi-hygrothermograph/master.svg)](https://coveralls.io/github/hannseman/homebridge-mi-hygrothermograph?branch=master)

[Homebridge](https://github.com/nfarina/homebridge) plugin for exposing measured temperature and humidity from the [Xiaomi Mi Bluetooth Temperature and Humidity Sensor](https://www.xiaomistore.pk/mi-bluetooth-temperature-humidity-monitor.html) as a [HomeKit](https://www.apple.com/ios/home/) accessory.

![alt text](images/hygrothermograph.png "Xiaomi Mi Bluetooth Temperature and Humidity Sensor")

## Installation
Make sure your system matches the prerequisites. You need to have a C compiler and the [Node.js](https://nodejs.org/) server. 

[Noble](https://github.com/noble/noble) is BLE central module library for [Node.js](https://nodejs.org/) used to discover and read values from the hygrothermograph. 

 These libraries and their dependencies are required by [Noble](https://www.npmjs.com/package/noble) package and provide access to the kernel Bluetooth subsystem.

```sh
sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev
```

For more detailed information and descriptions for other platforms please see the [Noble documentation](https://github.com/noble/noble#readme).
 
### Install homebridge and this plugin 
```
[sudo] npm install -g --unsafe-perm homebridge
[sudo] npm install -g homebridge-mi-hygrothermograph
```

**Note:** depending on your platform you might need to run `npm install -g`  with root privileges.

See the [Homebridge documentation](https://github.com/nfarina/homebridge#readme) for more information.

If you are running Homebridge as another user than `root`  (you should) then some additional configuration needs to be made to allow [Node.js](https://nodejs.org/) access to the kernel Bluetooth subsystem without root privileges. 
Please see the [Noble documentation](https://github.com/noble/noble#running-without-rootsudo) for instructions.

## Homebridge configuration
Update your Homebridge `config.json` file. See [config-sample.json](config-sample.json) for a complete example.

```json
"accessories": [
    {
      "accessory": "Hygrotermograph",
      "name": "Temperature & Humidity"
    }
]
```

### Multiple sensors 
When running just one Hygrotermograph accessory there is no need to specify the address of the BLE device. 
But if you want to run multiple Hygrotermograph accessories you need to specify the BLE address for each of them. 
If the address is not specified they will interfere with each other. 

The easiest way to find the address of the device is to use `[sudo] hcitool lescan`. 
It will start a scan for all advertising BLE peripherals within range. Look for `MJ_HT_V1` and copy the address.
The address is in the format of `4c:64:a8:d0:ae:65`.

Update your Homebridge `config.json` and specify the `address` key:

```json
"accessories": [
    {
      "accessory": "Hygrotermograph",
      "name": "Room 1",
      "address": "4c:64:a8:d0:ae:65"
    },
    {
      "accessory": "Hygrotermograph",
      "name": "Room 2",
      "address": "2c:34:b3:d4:a1:61"
    }
]
```

## Timeout
If the accessory has not received an updated value from the sensor within the specified timeout it will inform Homekit
that the accessory is not reachable by returning an error until it receives an updated value. 

The default timeout is 15 minutes but can be changed by specifying the number of minutes under the `timeout` key in `config.json`:

```json
"accessories": [
    {
      "accessory": "Hygrotermograph",
      "name": "Temperature & Humidity",
      "timeout": 30
    }
]
```

 
## Technical details
The plugin scans for [Bluetooth Low Energy](https://en.wikipedia.org/wiki/Bluetooth_Low_Energy) peripherals and check the broadcast advertisement packets.
By only reading the advertisement packet there is no need to establish a connection to the peripheral.
Inside each packet discovered we look for Service Data with a UUID of `0xfe95`. If found we start trying to parse the actual Service Data to find the temperature and humidity.

By using a [Bluetooth LE Sniffer](https://www.adafruit.com/product/2269) it is possible to see that the peripheral advertises 3 different sized Service Data: 
1. `50:20:aa:01:be:64:ae:d0:a8:65:4c:0d:10:04:cc:00:8a:01`
2. `50:20:aa:01:ba:64:ae:d0:a8:65:4c:06:10:02:84:01`
3. `50:20:aa:01:c0:64:ae:d0:a8:65:4c:0a:10:01:5d`

Some bytes stay the same and some bytes change over time. By placing the peripheral in different temperated places it could be established that the last bytes contain the sensor data.

These were the observations:

* In the first example the last two bytes `8a:01` contains the humidity data. `8a:01` as an little endian 16-bit integer is equal to `394` as in 39.4 % relative humidity. If we check the next two bytes `cc:00` they equal to `204` as in 20.4 celsius. 
* In the second example `84:01` equals to `388` as in 38.8 % relative humidity. No temperature could be found in this data, more on that later. 
* In the shortest and third example `5d` equals to `93` and this very much looks like the charge level on the battery in percent.
* If we start looking at the other bytes in order the next one looks like a length indicator for the following bytes with `04`, `02` and `01` as values. 
* The following two bytes almost always stays the same for each sized packet except for the 16 bytes sized data here they alterate between `06:10` and `04:10`. 
After some investigation it is established that these bytes indicate what type of sensor data that will follow. `06:10` will have humidity data and `04:10` will have temperature data.
`0d:10` indicate that both humidity and temperature data will follow and `0a:10` that battery data is to be expected. 

So we actually have 4 different packets that contains the sensor data:

1. `50:20:aa:01:be:64:ae:d0:a8:65:4c:0d:10:04:cc:00:8a:01`
2. `50:20:aa:01:ba:64:ae:d0:a8:65:4c:06:10:02:84:01`
3. `50:20:aa:01:bf:65:ae:d0:a8:65:4c:04:10:02:cc:00`
4. `50:20:aa:01:c0:64:ae:d0:a8:65:4c:0a:10:01:5d`

After some investigation and thanks to [node-xiaomi-gap-parser](https://github.com/LynxyssCZ/node-xiaomi-gap-parser) it is probable that the data of `50:20:aa:01:be:64:ae:d0:a8:65:4c:0d:10:04:cc:00:8a:01` represents the following: 

| byte  | function      | type      |
|:-----:|---------------|-----------|
| 1-2   | Frame control | bit field |
| 3-4   | ID            | uint16LE  |
| 5     | Index         | uint8LE   |
| 6-10  | MAC-address   | string    |
| 11    | Capabilities  | bit field |
| 12-13 | Type of data  | uint16LE  |
| 14    | Length        | uint8LE   |
| 15-16 | Temperature   | int16LE   |
| 17-18 | Humidity      | uint16LE  |

Bytes 1-14 have the same function for all 4 variations but the following bytes contain different sensor data.
