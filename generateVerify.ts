import fs from 'fs';
import path from 'path';

interface Item {
  type: string;
  name: string;
  contractAddress: string;
  parsedArguments: string[];
}

function wrapWithQuotesIfNeeded(argument: string): string {
  if (argument.toString().includes(" ")) {
    return `"${argument}"`;
  }
  return argument;
}

function recursiveReadFiles(dir: string): string[] {
  const files = fs.readdirSync(dir);
  const formattedStrings: string[] = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      const subDirectoryFormattedStrings = recursiveReadFiles(filePath); // Recursively call the function for subdirectories
      formattedStrings.push(...subDirectoryFormattedStrings);
    } else {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      try {
        const jsonData: Item[] = JSON.parse(fileContent).filter(x => x.type == 'deployment');
        const itemFormattedStrings = jsonData.map(item => {
          const formattedArguments = item.parsedArguments.map(wrapWithQuotesIfNeeded);
          const argumentsString = formattedArguments.join(" ");
          return `#${item.name}\nnpx hardhat verify ${item.contractAddress} ${argumentsString} --network $1\n`;
        });
        formattedStrings.push(...itemFormattedStrings);
      } catch (error) {
        console.error(`Error parsing JSON in file ${filePath}:`, error);
      }
    }
  }

  return formattedStrings;
}

// Usage
const directoryPath = './deployments';
const allFormattedStrings = recursiveReadFiles(directoryPath);
const joinedContent = allFormattedStrings.join('\n');
const outputFilePath = './verify.sh';
fs.writeFileSync(outputFilePath, joinedContent);
fs.chmodSync(outputFilePath, '755'); // Set executable permission
console.log(`Formatted strings written to ${outputFilePath} and made executable.`);