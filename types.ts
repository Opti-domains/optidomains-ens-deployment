export interface DeploymentActionResult {

}

export interface DeploymentAction {
  type: string
  name: string
  artifact: string
  constructorArguments: (string | number)[]
  leading: string
  salt: string
  contractAddress: string
  deployments: null | undefined | DeploymentActionResult[]
}

export interface TxActionResult {

}

export interface TxAction {
  type: string
  target: string
  selector: string
  args: (string | number)[]
  deployments: null | undefined | DeploymentActionResult[]
}