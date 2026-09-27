import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const envPath = path.resolve('backend/.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const lines = envContent.split(/\r?\n/);
const envVars = {};

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const match = trimmed.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    envVars[key] = val;
  }
}

// Adjust NODE_ENV for production
if (envVars['NODE_ENV'] === 'development') {
  envVars['NODE_ENV'] = 'production';
}

console.log(`Found ${Object.keys(envVars).length} environment variables to push to Vercel.`);

const environments = ['production', 'preview', 'development'];

for (const [key, val] of Object.entries(envVars)) {
  for (const env of environments) {
    try {
      execSync(`npx vercel env add ${key} ${env}`, {
        input: val,
        cwd: path.resolve('backend'),
        stdio: ['pipe', 'ignore', 'ignore'],
      });
      console.log(`✓ Added ${key} to ${env}`);
    } catch (err) {
      console.log(`Notice: ${key} already exists or error on ${env}`);
    }
  }
}

console.log('All environment variables processed!');
