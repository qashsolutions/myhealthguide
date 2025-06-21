import { GoogleAuth } from 'google-auth-library';
import { SafetySetting } from '@/types';

/**
 * Vertex AI configuration for federated MedGemma model
 * Uses service account credentials from environment
 */

// Parse service account credentials from environment
const getServiceAccountCredentials = () => {
  const credentialsJson = process.env.GOOGLE_CLOUD_CREDENTIALS;
  
  if (!credentialsJson) {
    throw new Error('GOOGLE_CLOUD_CREDENTIALS environment variable not set');
  }
  
  try {
    return JSON.parse(credentialsJson);
  } catch (error) {
    console.error('Failed to parse GOOGLE_CLOUD_CREDENTIALS:', error);
    throw new Error('Invalid GOOGLE_CLOUD_CREDENTIALS format');
  }
};

// Initialize Google Auth client
let authClient: GoogleAuth | null = null;

export const getAuthClient = () => {
  if (!authClient) {
    const credentials = getServiceAccountCredentials();
    
    authClient = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }
  
  return authClient;
};

// Vertex AI configuration
export const VERTEX_AI_CONFIG = {
  project: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
  location: 'us-central1', // MedGemma is typically available in us-central1
  endpoint: 'us-central1-aiplatform.googleapis.com',
  model: 'medgemma', // Model name for federated MedGemma
  apiVersion: 'v1',
};

// API endpoints
export const VERTEX_AI_ENDPOINTS = {
  predict: `https://${VERTEX_AI_CONFIG.endpoint}/${VERTEX_AI_CONFIG.apiVersion}/projects/${VERTEX_AI_CONFIG.project}/locations/${VERTEX_AI_CONFIG.location}/endpoints/${VERTEX_AI_CONFIG.model}:predict`,
  generateContent: `https://${VERTEX_AI_CONFIG.endpoint}/${VERTEX_AI_CONFIG.apiVersion}/projects/${VERTEX_AI_CONFIG.project}/locations/${VERTEX_AI_CONFIG.location}/publishers/google/models/medgemma:generateContent`,
};

// Model parameters
export const MODEL_PARAMETERS = {
  medication_check: {
    temperature: 0.2, // Lower temperature for more consistent medical responses
    maxOutputTokens: 1024,
    topK: 10,
    topP: 0.95,
    candidateCount: 1,
  },
  health_qa: {
    temperature: 0.4, // Slightly higher for Q&A
    maxOutputTokens: 512,
    topK: 20,
    topP: 0.95,
    candidateCount: 1,
  },
};

// Safety settings for medical content
export const SAFETY_SETTINGS: SafetySetting[] = [
  {
    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_HARASSMENT',
    threshold: 'BLOCK_LOW_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_HATE_SPEECH',
    threshold: 'BLOCK_LOW_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    threshold: 'BLOCK_LOW_AND_ABOVE',
  },
];

// Validate configuration
export const validateConfig = (): boolean => {
  const required = [
    'GOOGLE_CLOUD_PROJECT_ID',
    'GOOGLE_CLOUD_CREDENTIALS',
  ];
  
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`Missing required environment variable: ${key}`);
      return false;
    }
  }
  
  return true;
};