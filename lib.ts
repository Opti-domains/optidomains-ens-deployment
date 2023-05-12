import * as dotenv from "dotenv";
dotenv.config();

import ImmutableCreate2FactoryABI from "./ImmutableCreate2FactoryABI.json"
import { ethers } from "ethers"
import { CHAINS } from "./config";
import fs from "fs";
import { DeploymentAction } from "./types";
import { randomBytes } from 'crypto'

const ImmutableCreate2Factory = new ethers.Contract("0x0000000000ffe8b47b3e2130213b802212439497", ImmutableCreate2FactoryABI)

let provider, wallet;

export function setupWallet(chain: string) {
  provider = new ethers.providers.JsonRpcProvider(CHAINS[chain].url);
  wallet = new ethers.Wallet(process.env.DEPLOYER_KEY);
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
