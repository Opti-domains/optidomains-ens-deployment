export const CHAINS = {
  hardhat: {
    type: "evm",
    rpc: "http://127.0.0.1:8545",
    chainId: 31337,
  },
  goerli: {
    type: "evm",
    rpc: `https://eth-goerli.g.alchemy.com/v2/Kb0-sSQHUeURzm-QCj-pXKS0Viefa_kX`,
    chainId: 5,
  },
  optimism: {
    type: "evm",
    rpc: `https://mainnet.optimism.io`,
    chainId: 10,
  },
  optimism_goerli: {
    type: "evm",
    rpc: `https://goerli.optimism.io`,
    chainId: 420,
  },
  base: {
    type: "evm",
    rpc: `https://mainnet.base.org`,
    chainId: 8453,
  },
  base_goerli: {
    type: "evm",
    rpc: `https://goerli.base.org`,
    chainId: 84531,
  },
  polygonzkevm_goerli: {
    type: "evm",
    rpc: `https://rpc.public.zkevm-test.net`,
    chainId: 1442,
  },
  zksync_goerli: {
    type: "evm",
    rpc: `https://testnet.era.zksync.dev`,
    chainId: 280,
  },
  xdc_testnet: {
    type: "evm",
    rpc: "https://erpc.apothem.network",
    chainId: 51,
  },
  gnosis_testnet: {
    type: "evm",
    rpc: "https://rpc.chiadochain.net",
    chainId: 10200,
  },
  mode_testnet: {
    type: "evm",
    rpc: "https://sepolia.mode.network",
    chainId: 919,
  },

  hedera_testnet: {
    type: "evm",
    rpc: "https://hashgraph.arkhia.io/hedera/testnet/json-rpc/v1/nT1M9788al140405M1A284I1379To1N5",
    chainId: 296,
  }
};
