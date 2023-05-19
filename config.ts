export const CHAINS = {
  hardhat: {
    type: "evm",
    rpc: "http://127.0.0.1:8545",
    chainId: 31337,
  },
  optimism_goerli: {
    type: "evm",
    rpc: `https://opt-goerli.g.alchemy.com/v2/Uqc2nrzJBeN1oVuuDQ0ON_aPUokXzApf`,
    chainId: 420,
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
  }
};
