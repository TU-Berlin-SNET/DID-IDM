const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TestCredentials signining", function() {
  let Credentials, credentials;
  let owner, controller1, controller2, controller3, controller4, controller5, other;

  // TODO: refactro the next 2 functions into seperate file 
  function hashCredentials(strings, numbers, bools, addresses) {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string[]", "uint256[]", "bool[]", "address[]"],
      [strings, numbers, bools, addresses]
    );
    return ethers.keccak256(encoded)
  }

  function hashAddressToken(token) {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address"],
      [token]
    );
    return ethers.keccak256(encoded)
  }
  function hashToken(token) {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string"],
      [token]
    );
    return ethers.keccak256(encoded)
  }

  beforeEach(async function() {

    [owner, controller1, controller2, controller3, controller4, controller5, other] = await ethers.getSigners();

    Credentials = await ethers.getContractFactory("Credentials");
    credentials = await Credentials.deploy(
    );
    await credentials.waitForDeployment();
  });


  it("Check if hashing works equally on chain and off chain", async function() {
    const strArr = ["Alice", "Bob"];
    const numArr = [123, 456];
    const boolArr = [true, false];
    const addrArr = [
      "0x1234567890123456789012345678901234567890",
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    ];

    const jsHash = hashCredentials(strArr, numArr, boolArr, addrArr);
    const res = await credentials.hashCredentials(strArr, numArr, boolArr, addrArr)

    expect(jsHash).to.equal(res);

  }
  )

  it("tests recoverSigner", async function() {

    const token = "sometoken"
    const tokenHash = hashToken(token)
    const signature = await controller1.signMessage(ethers.toBeArray(tokenHash))

    const res = await credentials.recoverSigner(tokenHash, signature)
    expect(res).to.equal(controller1.address);
  })

  it("tests recoverTokenSigner", async function() {

    const token = "sometoken"
    const tokenHash = hashToken(token)
    const signature = await controller1.signMessage(ethers.toBeArray(tokenHash))

    // this function has overlaoded signature there is also one that takes address instead of string
    const res = await credentials["recoverTokenSigner(string,bytes)"](token, signature)
    expect(res).to.equal(controller1.address);
  })

  it("tests recoverVCSigner", async function() {
    const strArr = ["Alice", "Bob"];
    const numArr = [123, 456];
    const boolArr = [true, false];
    const addrArr = [
      "0x1234567890123456789012345678901234567890",
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    ];

    const jsHash = hashCredentials(strArr, numArr, boolArr, addrArr);
    const signature = await controller1.signMessage(ethers.toBeArray(jsHash))

    const res = await credentials.recoverVCSigner(strArr, numArr, boolArr, addrArr, signature)
    expect(res).to.equal(controller1.address);
  })

  it("tests verifyTokenSignature", async function() {

    const token = "sometoken"
    const tokenHash = hashToken(token)
    const signature = await controller1.signMessage(ethers.toBeArray(tokenHash))

    const res = await credentials.verifyTokenSignature(controller1.address, token, signature)
    expect(res).to.equal(true);

    const res2 = await credentials.verifyTokenSignature(controller2.address, token, signature)
    expect(res2).to.equal(false);

  })

  it("tests verifyVCsignature", async function() {
    const strArr = ["Alice", "Bob"];
    const numArr = [123, 456];
    const boolArr = [true, false];
    const addrArr = [
      "0x1234567890123456789012345678901234567890",
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    ];

    const jsHash = hashCredentials(strArr, numArr, boolArr, addrArr);
    const signature = await controller1.signMessage(ethers.toBeArray(jsHash))

    const res = await credentials.verifyVCSignature(controller1.address, strArr, numArr, boolArr, addrArr, signature)
    expect(res).to.equal(true);

    const res2 = await credentials.verifyVCSignature(controller2.address, strArr, numArr, boolArr, addrArr, signature)
    expect(res2).to.equal(false);

  })
})
