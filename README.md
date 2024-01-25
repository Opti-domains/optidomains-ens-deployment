# Opti.domains V1 Permissionless Deployer

To deploy Opti.domains V1 on your chain, follow this simple steps

## Install dependencies

```bash
npm install -g ts-node
npm install -g yarn
```

## Setup environment variable

Copy `.env.example` to `.env` and input your deployer private key

```
DEPLOYER_KEY=<Deployer private key>
```

## Add your chain to config.ts

## Deploy Seaport's Immutable CREATE2 Factory

### [Recommended] Execute setupFactory.ts

Simply run below command to deploy Seaport's Immutable CREATE2 Factory

```bash
ts-node setupFactory.ts <CHAIN_NAME>
```

Note: In case some component is already deployed, it will revert on an attempt to redeploy. You need to manually comment that line out from the setupFactory.ts code.

### [Alternative] Seaport Installation Guide

Follow Seaport document on how to deploy a Seaport's Immutable CREATE2 Factory

https://github.com/ProjectOpenSea/seaport/blob/main/docs/Deployment.md

Note: You don't need to deploy ConduitController and Seaport 1.5. Only Immutable CREATE2 Factory is needed

## Run Opti.domains permissionless deployment script

Simply run below command to deploy Opti.domains on any OP Stack chains

```bash
ts-node deployPublic.ts <CHAIN_NAME>
```

For example

```bash
ts-node deployPublic.ts base
```

## Setup EAS schema

Simply run below command to set up required Opti.domains EAS Schema

```bash
ts-node setupSchema.ts <CHAIN_NAME>
```

Note: In case some schema is already registered, it will revert. You need to manually comment that line out from the deploy-factory.ts code.
