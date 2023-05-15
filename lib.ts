import * as dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";

import ImmutableCreate2FactoryABI from "./ImmutableCreate2FactoryABI.json"
import RootABI from "./RootABI.json"

import { ethers } from "ethers"
import { CHAINS } from "./config";
import { DeploymentAction, TxAction } from "./types";
import { randomBytes } from 'crypto'

let ImmutableCreate2Factory = new ethers.Contract("0x0000000000ffe8b47b3e2130213b802212439497", ImmutableCreate2FactoryABI)
let Root: ethers.Contract

let provider, wallet;

export function setupWallet(chain: string, pk = process.env.DEPLOYER_KEY) {
  provider = new ethers.providers.JsonRpcProvider(CHAINS[chain].rpc);
  wallet = new ethers.Wallet(pk, provider);

  ImmutableCreate2Factory = new ethers.Contract("0x0000000000ffe8b47b3e2130213b802212439497", ImmutableCreate2FactoryABI, wallet)
}

export function getWallet(): ethers.Wallet {
  return wallet
}

export function getProvider(): ethers.providers.JsonRpcProvider {
  return provider
}

export function getAddressFromPk(privateKey: string) {
  // Create a new wallet instance using the private key
  const wallet = new ethers.Wallet(privateKey);

  // Get the address from the wallet
  const address = wallet.address;

  return address
}

export function resolveAddress(dict: {[name: string]: string}, data: any) {
  for (let key in data) {
    if (typeof data[key] === "string") {
      const template: string = data[key]
      if (template.startsWith("<") && template.endsWith(">")) {
        data[key] = dict[template.substring(1, template.length - 1)];
        if (!data[key]) {
          console.error("Not found " + template)
        }
      }
    } else if (typeof data[key] === "object") {
      data[key] = resolveAddress(dict, data[key])
    }
  }

  return data
}

export function loadArtifact(path: string) {
  const parts = path.split('/')
  const filename = parts[parts.length - 1].substring(0, parts[parts.length - 1].length - 4)
  return JSON.parse(
    fs.readFileSync('./artifacts/contracts/' + path + '/' + filename + '.json').toString('utf8')
  )
}

export function buildInitCode(dict: {[name: string]: string}, action: DeploymentAction) {
  action = resolveAddress(dict, action) as DeploymentAction
  const artifact = loadArtifact(action.artifact)
  const constructorArgs = artifact.abi.find(x => x.type == 'constructor')?.inputs.map(x => x.type)
  if (!constructorArgs) {
    return artifact.bytecode
  }
  return artifact.bytecode + ethers.utils.defaultAbiCoder.encode(constructorArgs, action.constructorArguments).substring(2)
}

export function calculateAddressBySalt(initCode: string, salt: string): string {
  const initCodeHash = ethers.utils.keccak256(initCode);

  const create2Hash = ethers.utils.solidityKeccak256(
    ["bytes1", "address", "bytes32", "bytes32"],
    ["0xff", "0x0000000000FFe8B47B3e2130213B802212439497", salt, initCodeHash]
  );

  const deploymentAddress = "0x" + create2Hash.substring(create2Hash.length - 40, create2Hash.length)

  return deploymentAddress;
}

export function scanSalt(initCode: string, leading: string): [string, string] {
  let address = ""
  let salt = ""

  while (!address.startsWith("0x" + leading)) {
    salt = "0x0000000000000000000000000000000000000000" + randomBytes(12).toString('hex')
    address = calculateAddressBySalt(initCode, salt)
    if (address.startsWith('0x091'))
    console.log(salt, address)
  }

  return [salt, address]
}

export function generateAddressPipeline(dict: {[name: string]: string}, action: DeploymentAction): DeploymentAction {
  const initCode = buildInitCode(dict, action)
  console.log(initCode)
  if (!action.contractAddress) {
    [action.salt, action.contractAddress] = scanSalt(initCode, action.leading)
  }
  return action
}

export function rootGenerateSignature(
  rootAddress: string,
  topic: string,
  nonce: number,
  digestIn: string,
  pk: string,
) {
  // Define the input types and values of the transaction data
  const inputTypes = [
    'bytes1',
    'bytes1',
    'address',
    'bytes32',
    'uint256',
    'bytes32',
  ]
  const inputValues = ['0x19', '0x00', rootAddress, topic, nonce, digestIn]

  console.log(inputValues)

  // ABI-encode the transaction data
  const digest = ethers.utils.solidityKeccak256(inputTypes, inputValues)

  // console.log(
  //   digest,
  //   controller.address,
  //   network.config.chainId,
  //   isTakeover
  //     ? '0x0548274c4be004976424de9f6f485fbe40a8f13e41524cd574fead54e448415c'
  //     : '0xdd007bd789f73e08c2714644c55b11c7d202931d717def434e3c9caa12a9f583',
  //   commitment,
  // )

  const signingKey = new ethers.utils.SigningKey(pk)
  const signature = signingKey.signDigest(digest)

  return ethers.utils.hexlify(
    ethers.utils.concat([
      signature.r,
      signature.s,
      ethers.utils.hexlify(signature.v),
    ]),
  )
}

export async function deployContract(initCode: string, salt: string) {
  return await (await ImmutableCreate2Factory.safeCreate2(salt, initCode)).wait();
}

export const TOPIC_LOCK = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes('lock'),
)
export const TOPIC_EXECUTE = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes('execute'),
)
export const TOPIC_TRANSFER_OWNERSHIP = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes('transferOwnership'),
)
export const TOPIC_SET_CONTROLLER = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes('setController'),
)

export async function performRootTx(dict: {[name: string]: string}, action: TxAction, pk: string) {
  if (!Root) {
    Root = new ethers.Contract(dict.Root, RootABI, wallet)
  }

  const target = resolveAddress(dict, action.target)

  const nonce = await Root.currentNonce();

  const iface = new ethers.utils.Interface([
    action.selector,
  ])

  const functionName = action.selector.match(/function\s+(\w+)/)[1];

  console.log(functionName, action.selector, action.args)

  const calldata = iface.encodeFunctionData(functionName, action.args)

  const signature = rootGenerateSignature(
    dict.Root,
    TOPIC_EXECUTE,
    nonce,
    ethers.utils.solidityKeccak256(
      ['address', 'bytes'],
      [target, calldata],
    ),
    pk,
  )

  const tx = await Root.execute(
    target,
    calldata,
    signature,
  )

  return {
    tx: await tx.wait(),
    signature
  }
}
