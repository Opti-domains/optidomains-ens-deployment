import * as dotenv from "dotenv";
dotenv.config();

import { ethers } from "ethers"

const SET_REGISTRY_MAPPING = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes('UniversalENSRegistry.setRegistryMapping'),
)

async function setRegistryMappingSignature(pk, nonce, registries, chainId = 0) {
  const signer = new ethers.Wallet(pk)
  const digest = chainId
    ? ethers.utils.solidityKeccak256(
        ['bytes32', 'uint256', 'uint256', 'address[]'],
        [SET_REGISTRY_MAPPING, chainId, nonce, registries],
      )
    : ethers.utils.solidityKeccak256(
        ['bytes32', 'uint256', 'address[]'],
        [SET_REGISTRY_MAPPING, nonce, registries],
      )
  const signature = await signer.signMessage(ethers.utils.arrayify(digest))
  return signature
}

setRegistryMappingSignature(
  process.env.DEPLOYER_KEY,
  1,
  ['0x888811b3DFC94566Fc8F6aC5e86069981a50B490'],
).then(signature => {
  console.log(signature)
}).catch(err => {
  console.error(err)
})