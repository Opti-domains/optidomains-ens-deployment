import fs from "fs/promises";
import path from "path";
import { resolveAddress } from "./lib";

async function readFilesRecursively(directory) {
  try {
    // Read the contents of the directory
    const files = await fs.readdir(directory);

    // Array to store filenames
    const fileArray = [];

    // Iterate over the files
    for (const file of files) {
      const filePath = path.join(directory, file);

      // Check if the current item is a file or directory
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        // It's a file, add it to the array
        fileArray.push(filePath);
      } else if (stats.isDirectory()) {
        // It's a directory, recursively read its contents
        const subDirectoryFiles = await readFilesRecursively(filePath);
        fileArray.push(...subDirectoryFiles);
      }
    }

    // Sort the fileArray
    fileArray.sort();

    return fileArray;
  } catch (err) {
    console.error('Error reading directory:', err);
    throw err;
  }
}

async function processSingle(dict, filePath) {
  const stats = await fs.stat(filePath);
  if (stats.isFile()) {
    // It's a file, check if it's a JSON file
    if (path.extname(filePath).toLowerCase() === '.json') {
      // Read the JSON file
      const fileContent = await fs.readFile(filePath, 'utf8');

      // Parse the JSON content
      const jsonData = JSON.parse(fileContent);

      // Put into dict
      for (let action of jsonData) {
        if (action.type == 'deployment') {
          dict[action.name] = action.contractAddress
        }
      }

      const actions = resolveAddress(dict, jsonData)

      // Process the JSON data
      console.log('File:', filePath);
      console.log('JSON data:', actions);
    }
  }
}

async function main() {
  const filePaths = await readFilesRecursively('deployments')

  const dict = {}

  for (const filePath of filePaths) {
    await processSingle(dict, filePath)
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err)
  process.exit(1)
})
