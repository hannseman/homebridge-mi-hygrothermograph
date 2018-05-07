const proxyquire = require("proxyquire").noCallThru();
const assert = require("assert");
const { describe, it } = require("mocha");
const sinon = require("sinon");

describe("index", () => {
  it("should export accessory", () => {
    const registerStub = sinon.stub();
    const accessoryStub = sinon.stub();
    const HomebridgeMock = {
      registerAccessory: registerStub
    };
    proxyquire("../index", {
      "./lib/accessory": () => ({ HygrothermographAccessory: accessoryStub })
    })(HomebridgeMock);
    assert(
      registerStub.calledWith(
        "homebridge-mi-hygrothermograph",
        "Hygrotermograph",
        accessoryStub
      )
    );
  });
});
