#Root
npx hardhat verify 0x88881190D24e8ecA11F0262972cff8081b2AFc45 0x88881111a0358cdf10Bc095aa14B95936aDA741f --network $1

#Multicall
npx hardhat verify 0x888811e68250624944575f8725b9364dB6eFe943  --network $1

#ENSRegistry
npx hardhat verify 0x888811b3DFC94566Fc8F6aC5e86069981a50B490 0x88881190D24e8ecA11F0262972cff8081b2AFc45 --network $1

#NameWrapperRegistry
npx hardhat verify 0x888811E08f362edB8B1BF4A52c08fED2A58a427E 0x888811b3DFC94566Fc8F6aC5e86069981a50B490 --network $1

#OptiDomainsAttestation
npx hardhat verify 0x888811653D30Ed5bd74f5afd4B2bffe2dE3192B3 0x888811E08f362edB8B1BF4A52c08fED2A58a427E 0x88881190D24e8ecA11F0262972cff8081b2AFc45 --network $1

#DiamondResolver
npx hardhat verify 0x888811Da0c852089cc8DFE6f3bAd190a46acaAE6 0x88881190D24e8ecA11F0262972cff8081b2AFc45 0x888811E08f362edB8B1BF4A52c08fED2A58a427E --network $1

#RegistryWhitelistAuthFacet
npx hardhat verify 0x888811761f31b8242fAe670C3f0a054e226D10e8  --network $1

#PublicResolverFacet
npx hardhat verify 0x888811B3c11F37a978eED349b174F7e9cCec14D7  --network $1

#ReverseRegistrar
npx hardhat verify 0x888811225d6751A0cf8a9F7fa6a77f4F1EF69DC9 0x888811b3DFC94566Fc8F6aC5e86069981a50B490 --network $1

#OptiDomains_BaseRegistrarImplementation
npx hardhat verify 0x8888111BAd1a449a6a0618C0fE7DC1727e3aaf99 0x888811b3DFC94566Fc8F6aC5e86069981a50B490 0x070904f45402bbf3992472be342c636609db649a8ec20a8aaa65faaafd4b8701 --network $1

#OptiDomains_MetadataService
npx hardhat verify 0x88881191aba4DEFD926dE9708C457d092120beaa https://metadata.opti.domains/token/domains/op --network $1

#OptiDomains_NameWrapper
npx hardhat verify 0x888811F1B21176E15FB60DF500eA85B490Dd2836 0x888811b3DFC94566Fc8F6aC5e86069981a50B490 0x8888111BAd1a449a6a0618C0fE7DC1727e3aaf99 0x88881191aba4DEFD926dE9708C457d092120beaa op --network $1

#OptiDomains_WhitelistRegistrarController
npx hardhat verify 0x8888117A2d8cC4e02A9A9691Ba0e166b2842360D 0x8888111BAd1a449a6a0618C0fE7DC1727e3aaf99 0x888811225d6751A0cf8a9F7fa6a77f4F1EF69DC9 0x888811F1B21176E15FB60DF500eA85B490Dd2836 0x8888112e21A42eAAD5DD2e9eDcE4BfD8327dAa6A 0 op --network $1

#BoredTown_BaseRegistrarImplementation
npx hardhat verify 0xB02ED512702C46dbDB260053C97f79c3F467E39E 0x888811b3DFC94566Fc8F6aC5e86069981a50B490 0x4e64474f406bfb88babba9d48fc501844ea2246343195cdcfe2fb6b54571b71b --network $1

#BoredTown_MetadataService
npx hardhat verify 0xB02EDED8502B029aA7f2CB02e1C2a0c452531279 https://metadata.opti.domains/token/domains/town --network $1

#BoredTown_NameWrapper
npx hardhat verify 0xB02ED980693e14E082F0A3A33060046Ae8495EB2 0x888811b3DFC94566Fc8F6aC5e86069981a50B490 0xB02ED512702C46dbDB260053C97f79c3F467E39E 0xB02EDED8502B029aA7f2CB02e1C2a0c452531279 town --network $1

#BoredTown_WhitelistRegistrarController
npx hardhat verify 0xB02EDc247246ACD78294c62F403B3e64D5917031 0xB02ED512702C46dbDB260053C97f79c3F467E39E 0x888811225d6751A0cf8a9F7fa6a77f4F1EF69DC9 0xB02ED980693e14E082F0A3A33060046Ae8495EB2 0x8888112e21A42eAAD5DD2e9eDcE4BfD8327dAa6A 0 town --network $1
