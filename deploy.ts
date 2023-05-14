import * as dotenv from "dotenv";
dotenv.config();

import fs from "fs/promises";
import path from "path";
import { buildInitCode, calculateAddressBySalt, deployContract, getAddressFromPk, getProvider, getWallet, performRootTx, resolveAddress, setupWallet } from "./lib";
import { cloneDeep } from "lodash";
import { ethers } from "ethers";

async function readFilesRecursively(directory) {
  try {
    // Read the contents of the directory
    const files = await fs.readdir(directory);

    // Array to store filenames
    const fileArray = [];

    // Iterate over the files
    for (const file of files) {
      const filePath = path.join(directory, file);

      // Check if the current item is a file or directory
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        // It's a file, add it to the array
        fileArray.push(filePath);
      } else if (stats.isDirectory()) {
        // It's a directory, recursively read its contents
        const subDirectoryFiles = await readFilesRecursively(filePath);
        fileArray.push(...subDirectoryFiles);
      }
    }

    // Sort the fileArray
    fileArray.sort();

    return fileArray;
  } catch (err) {
    console.error('Error reading directory:', err);
    throw err;
  }
}

const RAW_ACTION_SYMBOL = Symbol("rawAction")

async function processSingle(dict, filePath) {
  const stats = await fs.stat(filePath);
  if (stats.isFile()) {
    // It's a file, check if it's a JSON file
    if (path.extname(filePath).toLowerCase() === '.json') {
      // Read the JSON file
      const fileContent = await fs.readFile(filePath, 'utf8');

      // Parse the JSON content
      const jsonData = JSON.parse(fileContent);

      // Put into dict
      for (let action of jsonData) {
        action[RAW_ACTION_SYMBOL] = cloneDeep(action)
        delete action[RAW_ACTION_SYMBOL].deployments

        if (action.type == 'deployment') {
          dict[action.name] = action.contractAddress
        }
      }

      const actions = resolveAddress(dict, jsonData)

      // Process the JSON data
      // console.log('File:', filePath);
      // console.log('JSON data:', actions);

      for (let action of actions) {
        if (action.deployments && action.deployments.find(x => x.chain == dict.CHAIN_NAME)) {
          continue
        }

        if (action.type == 'deployment') {
          const initCode = buildInitCode(dict, action)
          const address = calculateAddressBySalt(initCode, action.salt)

          // console.log(action.name)
          // console.log(address)
          // console.log(initCode)
          // console.log(action.salt)

          if (address.toLowerCase() != action.contractAddress.toLowerCase()) {
            throw new Error("Address mismatch")
          }

          const tx = await deployContract(initCode, action.salt)

          console.log(`Contract ${action.name} deployed at ${action.contractAddress} (Tx: ${tx.transactionHash})`)

          // Save on deployments
          if (!action.deployments) action.deployments = []
          action.deployments.push({
            chain: dict.CHAIN_NAME,
            contractAddress: action.contractAddress,
            transactionHash: tx.transactionHash,
          })
        } else {
          const tx = await performRootTx(dict, action)
          console.log(`Root TX on ${action[RAW_ACTION_SYMBOL].target} (Tx: ${tx.transactionHash})`)

          // Save on deployments
          if (!action.deployments) action.deployments = []
          action.deployments.push({
            chain: dict.CHAIN_NAME,
            transactionHash: tx.transactionHash,
          })
        }

        // Rollback to raw action
        for (let key in action[RAW_ACTION_SYMBOL]) {
          action[key] = action[RAW_ACTION_SYMBOL][key]
        }

        // Save result to JSON
        await fs.writeFile(filePath, JSON.stringify(actions, undefined, 2))
      }
    }
  }
}

async function main() {
  // Retrieve command line arguments
  const args: string[] = process.argv.slice(2);
  const chainName: string = args[0]

  setupWallet(chainName)

  if (chainName == "hardhat") {
    const wallet = getWallet()
    const provider = getProvider()
  
    const balance = await provider.getBalance(wallet.address);
  
    if (parseFloat(ethers.utils.formatEther(balance)) < 0.5) {
      // Transfer 1 ETH to that address
      let tx = {
        to: wallet.address,
        value: ethers.utils.parseEther("1")
      }
  
      const signedTransaction = await (new ethers.Wallet(process.env.FACTORY_KEY, provider)).sendTransaction(tx);
      console.log('Transfer ETH to deployer:', signedTransaction.hash);
    }
  }

  const filePaths = await readFilesRecursively('deployments')

  const dict = {
    DEPLOYER: getAddressFromPk(process.env.DEPLOYER_KEY),
    OPERATOR: getAddressFromPk(process.env.OPERATOR_KEY),
    OWNER: getAddressFromPk(process.env.OWNER_KEY),
    CHAIN_NAME: chainName,
  }

  for (const filePath of filePaths) {
    await processSingle(dict, filePath)
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err)
  process.exit(1)
})
