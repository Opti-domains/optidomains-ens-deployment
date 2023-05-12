export interface DeploymentAction {
  type: string
  name: string
  artifact: string
  constructorArguments: (string | number)[]
  leading: string
  salt: string
  contractAddress: string
}