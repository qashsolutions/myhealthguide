/**
 * Security configuration for Next.js application
 * Implements multiple layers of security controls
 */

const { SECURITY_HEADERS } = require('./src/lib/security/security-config');

module.exports = {
  // Runtime security monitoring
  monitoring: {
    // Enable runtime application self-protection (RASP)
    enableRASP: process.env.NODE_ENV === 'production',
    
    // Anomaly detection thresholds
    anomalyDetection: {
      enabled: true,
      thresholds: {
        failedAuthAttempts: 10, // per 5 minutes
        rateLimitHits: 20, // per 5 minutes
        apiRequestsPerIP: 100, // per 5 minutes
      },
    },
    
    // Audit logging
    auditLogging: {
      enabled: true,
      events: [
        'authentication',
        'authorization',
        'dataAccess',
        'dataModification',
        'securityAlerts',
        'rateLimiting',
      ],
    },
  },
  
  // Supply chain security
  dependencies: {
    // Automated vulnerability scanning
    scanning: {
      enabled: true,
      schedule: 'daily',
      tools: ['npm-audit', 'snyk', 'owasp-dependency-check'],
      failOnHighSeverity: true,
    },
    
    // Package integrity verification
    integrity: {
      enabled: true,
      requireLockfile: true,
      verifySignatures: true,
    },
    
    // Allowed registries
    allowedRegistries: [
      'https://registry.npmjs.org/',
    ],
  },
  
  // Code analysis for logic bombs and backdoors
  codeAnalysis: {
    // Static analysis rules
    staticAnalysis: {
      enabled: true,
      rules: {
        // Detect eval and Function constructor
        noEval: true,
        noFunctionConstructor: true,
        
        // Detect dynamic code execution
        noDynamicRequire: true,
        noUnsafeRegex: true,
        
        // Detect time-based conditions
        suspiciousTimeChecks: true,
        suspiciousConditionals: true,
        
        // Detect network connections
        unauthorizedConnections: true,
        suspiciousUrls: true,
      },
    },
    
    // Runtime behavior analysis
    behaviorAnalysis: {
      enabled: process.env.NODE_ENV === 'production',
      monitoredPatterns: [
        'unexpectedNetworkConnections',
        'fileSystemAccess',
        'processExecution',
        'cryptoOperations',
        'environmentVariableAccess',
      ],
    },
  },
  
  // Security headers configuration
  headers: SECURITY_HEADERS,
  
  // Input validation rules
  validation: {
    // Strict input sanitization
    sanitization: {
      enabled: true,
      stripHtml: true,
      stripScripts: true,
      normalizeWhitespace: true,
    },
    
    // Content type validation
    contentTypes: {
      allowedMimeTypes: [
        'application/json',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/webp',
      ],
      maxFileSize: 5 * 1024 * 1024, // 5MB
    },
  },
  
  // API security
  api: {
    // Request signing
    requestSigning: {
      enabled: process.env.NODE_ENV === 'production',
      algorithm: 'sha256',
      headerName: 'X-Request-Signature',
    },
    
    // API versioning
    versioning: {
      enabled: true,
      headerName: 'X-API-Version',
      supportedVersions: ['v1'],
    },
    
    // Rate limiting (enhanced)
    rateLimiting: {
      enabled: true,
      storage: process.env.NODE_ENV === 'production' ? 'redis' : 'memory',
      keyGenerator: 'ip-user',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
  },
  
  // Secrets management
  secrets: {
    // Environment variable validation
    validation: {
      enabled: true,
      required: [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'GOOGLE_CLOUD_CREDENTIALS',
        'RESEND_API_KEY',
        'JWT_SECRET',
        'ENCRYPTION_KEY',
      ],
    },
    
    // Key rotation
    rotation: {
      enabled: process.env.NODE_ENV === 'production',
      schedule: 'monthly',
      notifications: true,
    },
  },
  
  // Zero-day protection
  zeroDay: {
    // Virtual patching
    virtualPatching: {
      enabled: true,
      autoUpdate: true,
    },
    
    // Intrusion detection
    intrusionDetection: {
      enabled: process.env.NODE_ENV === 'production',
      sensitivity: 'high',
      blockSuspiciousRequests: true,
    },
    
    // Sandbox execution
    sandbox: {
      enabled: process.env.NODE_ENV === 'production',
      isolateUserCode: true,
      restrictFileSystem: true,
      restrictNetwork: true,
    },
  },
};