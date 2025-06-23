#!/usr/bin/env node

/**
 * Pre-build script to ensure environment is ready
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Running pre-build checks...');

// Ensure .next directory exists
const nextDir = path.join(__dirname, '..', '.next');
if (!fs.existsSync(nextDir)) {
  fs.mkdirSync(nextDir, { recursive: true });
  console.log('✅ Created .next directory');
}

// Check for required server-side environment variables
const requiredEnvVars = [
  'FIREBASE_ADMIN_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY',
  'FIREBASE_SERVER_API_KEY',
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.warn('⚠️  Missing server-side environment variables:', missingEnvVars.join(', '));
  console.warn('   These are required for production but can be omitted for local builds.');
}

console.log('✅ Pre-build checks complete');