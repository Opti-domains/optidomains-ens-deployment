import { ethers } from "ethers";
import { getProvider, getWallet, setupWallet } from "./lib";
import SchemaRegistryABI from "./SchemaRegistryABI.json"

async function main() {
  // Retrieve command line arguments
  const args: string[] = process.argv.slice(2);
  const chainName: string = args[0]
  const contractAddress: string = args[1]

  setupWallet(chainName)

  const provider = getProvider()
  const wallet = getWallet()

  const balance = await provider.getBalance(wallet.address);

  if (chainName == "hardhat" && balance.toNumber() == 0) {
    // Transfer 0.5 ETH to that address
    let tx = {
      to: wallet.address,
      value: ethers.utils.parseEther("0.5")
    }

    const signedTransaction = await new ethers.Wallet(process.env.FACTORY_KEY, provider).sendTransaction(tx);
    console.log('Transfer ETH to deployer:', signedTransaction.hash);
  }

  const schemaRegistry = new ethers.Contract(contractAddress, SchemaRegistryABI, wallet)

  await (await schemaRegistry.register("bytes32 node,uint256 contentType,bytes abi", "0x0000000000000000000000000000000000000000", true)).wait()
  await (await schemaRegistry.register("bytes32 node,uint256 coinType,bytes address", "0x0000000000000000000000000000000000000000", true)).wait()
  await (await schemaRegistry.register("bytes32 node,bytes hash", "0x0000000000000000000000000000000000000000", true)).wait()
  await (await schemaRegistry.register("bytes32 node,bytes zonehashes", "0x0000000000000000000000000000000000000000", true)).wait()
  await (await schemaRegistry.register("bytes32 node,bytes32 nameHash,uint16 resource,bytes data", "0x0000000000000000000000000000000000000000", true)).wait()
  await (await schemaRegistry.register("bytes32 node,bytes32 nameHash,uint16 count", "0x0000000000000000000000000000000000000000", true)).wait()
  await (await schemaRegistry.register("bytes32 node,bytes4 interfaceID,address implementer", "0x0000000000000000000000000000000000000000", true)).wait()
  await (await schemaRegistry.register("bytes32 node,string name", "0x0000000000000000000000000000000000000000", true)).wait()
  await (await schemaRegistry.register("bytes32 node,string key,string value", "0x0000000000000000000000000000000000000000", true)).wait()
  await (await schemaRegistry.register("bytes32 node,bytes32 x,bytes32 y", "0x0000000000000000000000000000000000000000", true)).wait()

  console.log('Setup success')
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err)
  process.exit(1)
})