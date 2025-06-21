#!/usr/bin/env node

/**
 * Postinstall script to setup environment
 */

const fs = require('fs');
const path = require('path');

console.log('📦 Running postinstall setup...');

// Create necessary directories
const dirs = [
  '.next',
  '.next/cache',
  'public',
];

dirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created ${dir} directory`);
  }
});

// Create next-env.d.ts if it doesn't exist
const nextEnvPath = path.join(__dirname, '..', 'next-env.d.ts');
if (!fs.existsSync(nextEnvPath)) {
  fs.writeFileSync(nextEnvPath, '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n// NOTE: This file should not be edited\n// see https://nextjs.org/docs/basic-features/typescript for more information.\n');
  console.log('✅ Created next-env.d.ts');
}

console.log('✅ Postinstall complete');