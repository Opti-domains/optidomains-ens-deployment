import * as dotenv from "dotenv";
dotenv.config();

import crypto from 'crypto';

const fixedIV: Buffer = Buffer.from(process.env.IV, 'hex'); // Replace with your desired fixed IV

export function encryptText(text: string, passphrase: string): string {
  const key: Buffer = deriveKeyFromPassphrase(passphrase);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, fixedIV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decryptText(encryptedText: string, passphrase: string): string {
  const key: Buffer = deriveKeyFromPassphrase(passphrase);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, fixedIV);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function deriveKeyFromPassphrase(passphrase: string): Buffer {
  const iterations: number = 100000; // Adjust the number of iterations as per your needs
  const keyLength: number = 32; // 256-bit key length

  return crypto.pbkdf2Sync(passphrase, fixedIV, iterations, keyLength, 'sha256');
}

// Example usage
// const args: string[] = process.argv.slice(2)
// const plaintext: string = args[0];
// const encryptedText: string = args[0];
// const encryptionKey: string = args[1];

// const encryptedText: string = encryptText(plaintext, encryptionKey);
// console.log('Encrypted text:', encryptedText);

// const decryptedText: string = decryptText(encryptedText, encryptionKey);
// console.log('Decrypted text:', decryptedText);