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

// Check for required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.warn('⚠️  Missing environment variables:', missingEnvVars.join(', '));
  console.warn('   Using fallback values for build...');
}

console.log('✅ Pre-build checks complete');