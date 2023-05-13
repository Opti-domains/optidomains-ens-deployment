export interface DeploymentAction {
  type: string
  name: string
  artifact: string
  constructorArguments: (string | number)[]
  leading: string
  salt: string
  contractAddress: string
}

export interface TxAction {
  type: string
  target: string
  selector: string
  args: (string | number)[]
}