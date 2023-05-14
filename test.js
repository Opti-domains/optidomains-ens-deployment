const ethers = require('ethers')

console.log(ethers.utils.defaultAbiCoder.encode(
  ["address", "address", "address", "string"],
  [
    "0x8888065406a0c0938a9857e6c79bf8aa6a1d8152",
    "0x888894d5cf713de1d0a31a460783a1ef2ce55fbe",
    "0x88886ecf8441818648f7e2d1bc31aa73a19bc6bf",
    "op"
  ]
).substring(2))