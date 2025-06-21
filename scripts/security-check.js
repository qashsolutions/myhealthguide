#!/usr/bin/env node

/**
 * Pre-build security check script
 * Runs comprehensive security validations before build
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// ANSI color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

// Security check results
const results = {
  passed: [],
  warnings: [],
  failures: [],
};

// Log helper functions
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => {
    console.log(`${colors.green}[PASS]${colors.reset} ${msg}`);
    results.passed.push(msg);
  },
  warning: (msg) => {
    console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`);
    results.warnings.push(msg);
  },
  error: (msg) => {
    console.log(`${colors.red}[FAIL]${colors.reset} ${msg}`);
    results.failures.push(msg);
  },
};

// 1. Check for known vulnerable patterns
function checkForVulnerablePatterns() {
  log.info('Checking for vulnerable code patterns...');
  
  const vulnerablePatterns = [
    { pattern: /eval\s*\(/g, description: 'eval() usage detected' },
    { pattern: /new\s+Function\s*\(/g, description: 'Function constructor detected' },
    { pattern: /innerHTML\s*=/g, description: 'innerHTML assignment detected' },
    { pattern: /document\.write/g, description: 'document.write detected' },
    { pattern: /\bexec\s*\(/g, description: 'exec() usage detected' },
    { pattern: /\bspawn\s*\(/g, description: 'spawn() usage detected' },
  ];
  
  const srcDir = path.join(__dirname, '..', 'src');
  const files = getAllFiles(srcDir, ['.ts', '.tsx', '.js', '.jsx']);
  
  let vulnerabilitiesFound = false;
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    vulnerablePatterns.forEach(({ pattern, description }) => {
      if (pattern.test(content)) {
        log.error(`${description} in ${file}`);
        vulnerabilitiesFound = true;
      }
    });
  });
  
  if (!vulnerabilitiesFound) {
    log.success('No vulnerable code patterns detected');
  }
}

// 2. Check for hardcoded secrets
function checkForSecrets() {
  log.info('Checking for hardcoded secrets...');
  
  const secretPatterns = [
    { pattern: /api[_-]?key\s*[:=]\s*["'][^"']{20,}/gi, description: 'Potential API key' },
    { pattern: /secret[_-]?key\s*[:=]\s*["'][^"']{20,}/gi, description: 'Potential secret key' },
    { pattern: /password\s*[:=]\s*["'][^"']+/gi, description: 'Hardcoded password' },
    { pattern: /bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi, description: 'Bearer token' },
    { pattern: /[a-f0-9]{40}/g, description: 'Potential SHA1 hash' },
  ];
  
  const srcDir = path.join(__dirname, '..', 'src');
  const files = getAllFiles(srcDir, ['.ts', '.tsx', '.js', '.jsx']);
  
  let secretsFound = false;
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    secretPatterns.forEach(({ pattern, description }) => {
      const matches = content.match(pattern);
      if (matches && !isTestFile(file)) {
        log.warning(`${description} found in ${file}`);
        secretsFound = true;
      }
    });
  });
  
  if (!secretsFound) {
    log.success('No hardcoded secrets detected');
  }
}

// 3. Check dependency vulnerabilities
function checkDependencies() {
  log.info('Checking dependency vulnerabilities...');
  
  try {
    const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
    const audit = JSON.parse(auditResult);
    
    if (audit.metadata.vulnerabilities.total === 0) {
      log.success('No known vulnerabilities in dependencies');
    } else {
      const { high, critical } = audit.metadata.vulnerabilities;
      
      if (critical > 0) {
        log.error(`${critical} critical vulnerabilities found in dependencies`);
      }
      if (high > 0) {
        log.warning(`${high} high severity vulnerabilities found in dependencies`);
      }
    }
  } catch (error) {
    log.warning('Could not run npm audit');
  }
}

// 4. Check for suspicious time-based conditions
function checkForTimeBombs() {
  log.info('Checking for time-based conditions...');
  
  const timePatterns = [
    { pattern: /new\s+Date\(\s*\d{4}/g, description: 'Hardcoded future date' },
    { pattern: /Date\.now\(\)\s*[<>]=?\s*\d{10,}/g, description: 'Time comparison with timestamp' },
    { pattern: /setTimeout\s*\([^,]+,\s*\d{7,}/g, description: 'Large timeout value' },
  ];
  
  const srcDir = path.join(__dirname, '..', 'src');
  const files = getAllFiles(srcDir, ['.ts', '.tsx', '.js', '.jsx']);
  
  let suspiciousFound = false;
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    timePatterns.forEach(({ pattern, description }) => {
      if (pattern.test(content)) {
        log.warning(`${description} in ${file}`);
        suspiciousFound = true;
      }
    });
  });
  
  if (!suspiciousFound) {
    log.success('No suspicious time-based conditions detected');
  }
}

// 5. Verify package integrity
function verifyPackageIntegrity() {
  log.info('Verifying package-lock.json integrity...');
  
  const packageLockPath = path.join(__dirname, '..', 'package-lock.json');
  
  if (!fs.existsSync(packageLockPath)) {
    log.error('package-lock.json not found');
    return;
  }
  
  try {
    const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
    
    // Check for packages from suspicious registries
    let suspiciousPackages = 0;
    
    const checkPackages = (packages) => {
      Object.entries(packages || {}).forEach(([name, details]) => {
        if (details.resolved && !details.resolved.startsWith('https://registry.npmjs.org/')) {
          log.warning(`Package ${name} from non-npm registry: ${details.resolved}`);
          suspiciousPackages++;
        }
      });
    };
    
    checkPackages(packageLock.dependencies);
    checkPackages(packageLock.packages);
    
    if (suspiciousPackages === 0) {
      log.success('All packages from trusted npm registry');
    }
  } catch (error) {
    log.error('Failed to parse package-lock.json');
  }
}

// 6. Check environment configuration
function checkEnvironment() {
  log.info('Checking environment configuration...');
  
  const requiredEnvVars = [
    'NODE_ENV',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'GOOGLE_CLOUD_PROJECT_ID',
    'RESEND_API_KEY',
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length === 0) {
    log.success('All required environment variables are set');
  } else {
    missingVars.forEach(varName => {
      log.warning(`Missing environment variable: ${varName}`);
    });
  }
}

// Helper function to get all files recursively
function getAllFiles(dirPath, extensions) {
  const files = [];
  
  function scanDir(dir) {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scanDir(fullPath);
      } else if (stat.isFile() && extensions.some(ext => fullPath.endsWith(ext))) {
        files.push(fullPath);
      }
    });
  }
  
  scanDir(dirPath);
  return files;
}

// Helper function to check if file is a test file
function isTestFile(filePath) {
  return filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__');
}

// Main execution
function main() {
  console.log(`\n${colors.blue}🔒 Running Security Checks...${colors.reset}\n`);
  
  checkForVulnerablePatterns();
  checkForSecrets();
  checkDependencies();
  checkForTimeBombs();
  verifyPackageIntegrity();
  checkEnvironment();
  
  // Summary
  console.log(`\n${colors.blue}📊 Security Check Summary:${colors.reset}`);
  console.log(`${colors.green}Passed: ${results.passed.length}${colors.reset}`);
  console.log(`${colors.yellow}Warnings: ${results.warnings.length}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failures.length}${colors.reset}`);
  
  if (results.failures.length > 0) {
    console.log(`\n${colors.red}❌ Security check failed! Please fix the issues before proceeding.${colors.reset}`);
    process.exit(1);
  } else if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}⚠️  Security check passed with warnings.${colors.reset}`);
  } else {
    console.log(`\n${colors.green}✅ All security checks passed!${colors.reset}`);
  }
}

// Run security checks
main();