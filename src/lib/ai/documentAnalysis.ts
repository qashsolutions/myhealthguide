/**
 * Document Analysis Service
 *
 * Extracts text from uploaded documents (PDFs, images) and provides
 * AI-powered analysis using Gemini's multimodal capabilities.
 *
 * IMPORTANT: This provides OBSERVATIONS ONLY - no medical recommendations,
 * diagnoses, or advice. All analysis must be verified with original documents
 * and healthcare providers.
 *
 * Uses Gemini 1.5 Pro's native multimodal capability for both OCR and analysis
 * (no additional dependencies required - uses existing @google-cloud/vertexai)
 */

import { VertexAI } from '@google-cloud/vertexai';
import { logPHIThirdPartyDisclosure, UserRole } from '../medical/phiAuditLog';
import { db } from '../firebase/config';
import { collection, addDoc, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';

// Initialize clients
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const location = process.env.VERTEX_AI_LOCATION || 'us-central1';

let vertexAI: VertexAI | null = null;

/**
 * Document types we can analyze
 */
export type DocumentType =
  | 'lab_result'
  | 'prescription'
  | 'discharge_summary'
  | 'medical_record'
  | 'insurance_document'
  | 'care_plan'
  | 'other';

/**
 * Analysis status
 */
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Extracted data structure
 */
export interface ExtractedData {
  documentType: DocumentType;
  dateOnDocument?: string;
  providerName?: string;
  patientName?: string;

  // For lab results
  labValues?: Array<{
    testName: string;
    value: string;
    unit?: string;
    referenceRange?: string;
    flag?: 'normal' | 'high' | 'low' | 'critical';
  }>;

  // For prescriptions
  medications?: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    quantity?: string;
    refills?: string;
    prescribedBy?: string;
  }>;

  // For discharge summaries
  diagnoses?: string[];
  procedures?: string[];
  followUpInstructions?: string[];

  // General observations
  keyFindings?: string[];
  rawText?: string;
}

/**
 * Document analysis record stored in Firestore
 */
export interface DocumentAnalysis {
  id?: string;
  userId: string;
  groupId: string;
  elderId: string;
  documentId: string; // Reference to storage_metadata document
  fileName: string;
  fileType: string;
  filePath: string;

  status: AnalysisStatus;
  extractedText?: string;
  extractedData?: ExtractedData;
  observations?: string[];

  // Metadata
  analysisModel: string;
  confidenceScore?: number;
  processingTimeMs?: number;

  // Timestamps
  createdAt: Date;
  completedAt?: Date;

  // Error handling
  errorMessage?: string;
}

/**
 * Initialize Vertex AI client (reuses existing pattern from medgemmaService.ts)
 */
function getVertexAI(): VertexAI {
  if (!vertexAI && projectId) {
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (credentialsJson) {
      try {
        const credentials = JSON.parse(credentialsJson);
        vertexAI = new VertexAI({
          project: projectId,
          location: location,
          googleAuthOptions: {
            credentials: credentials,
          },
        });
      } catch (error) {
        console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', error);
        throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON format');
      }
    } else {
      vertexAI = new VertexAI({
        project: projectId,
        location: location,
      });
    }
  }

  if (!vertexAI) {
    throw new Error('Vertex AI not configured');
  }

  return vertexAI;
}

/**
 * Fetch document as base64 from URL
 */
async function fetchDocumentAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return base64;
}

/**
 * Get MIME type for Gemini multimodal input
 */
function getGeminiMimeType(fileType: string): string {
  const mimeMap: Record<string, string> = {
    'application/pdf': 'application/pdf',
    'image/jpeg': 'image/jpeg',
    'image/png': 'image/png',
    'image/webp': 'image/webp',
    'image/tiff': 'image/tiff',
  };
  return mimeMap[fileType] || fileType;
}

/**
 * Analyze document with Gemini's multimodal capability
 * Gemini 1.5 Pro can directly read images and PDFs
 */
async function analyzeWithGeminiMultimodal(
  fileUrl: string,
  fileType: string,
  fileName: string
): Promise<{
  extractedText: string;
  extractedData: ExtractedData;
  observations: string[];
  confidenceScore: number;
}> {
  const vertex = getVertexAI();

  // Use Gemini 1.5 Pro which has multimodal (vision) capabilities
  const model = vertex.preview.getGenerativeModel({
    model: 'gemini-1.5-pro',
    generationConfig: {
      temperature: 0.2, // Low temperature for accuracy
      topP: 0.95,
      maxOutputTokens: 8192,
    },
    systemInstruction: `You are a medical document analyzer. Your role is to:
1. Read and extract text from the document
2. Identify the type of medical document
3. Extract key information in a structured format
4. Provide factual OBSERVATIONS ONLY - what the document says

CRITICAL RULES:
- NEVER provide medical recommendations or advice
- NEVER interpret what results mean for health
- NEVER suggest actions or treatments
- ONLY state what is written in the document
- If uncertain, say "unclear from document"
- Include confidence level for extractions

You are extracting information, not providing medical guidance.`,
  });

  // Fetch document and convert to base64
  const base64Data = await fetchDocumentAsBase64(fileUrl);
  const mimeType = getGeminiMimeType(fileType);

  const prompt = `Analyze this medical document and extract structured information.

FILE NAME: ${fileName}

TASKS:
1. First, extract ALL readable text from the document (OCR if needed)
2. Then analyze and structure the information

Return a JSON response with this structure:
{
  "extractedText": "The full text extracted from the document",
  "documentType": "lab_result|prescription|discharge_summary|medical_record|insurance_document|care_plan|other",
  "dateOnDocument": "date if found",
  "providerName": "healthcare provider/facility name if found",
  "patientName": "patient name if found (for verification)",

  "labValues": [
    {"testName": "...", "value": "...", "unit": "...", "referenceRange": "...", "flag": "normal|high|low|critical"}
  ],

  "medications": [
    {"name": "...", "dosage": "...", "frequency": "...", "quantity": "...", "refills": "...", "prescribedBy": "..."}
  ],

  "diagnoses": ["diagnosis 1", "diagnosis 2"],
  "procedures": ["procedure 1"],
  "followUpInstructions": ["instruction 1"],

  "keyFindings": [
    "Factual observation 1 from document",
    "Factual observation 2 from document"
  ],

  "confidenceScore": 0.85
}

IMPORTANT:
- Only include fields that are present in the document
- keyFindings should be factual statements of what the document contains
- Do NOT interpret results or provide medical opinions
- Return ONLY valid JSON`;

  try {
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          { text: prompt },
        ],
      }],
    });

    const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Build observations array from key findings
      const observations: string[] = parsed.keyFindings || [];

      // Add document type observation
      if (parsed.documentType && parsed.documentType !== 'other') {
        observations.unshift(`Document identified as: ${parsed.documentType.replace(/_/g, ' ')}`);
      }

      // Add date observation
      if (parsed.dateOnDocument) {
        observations.push(`Document dated: ${parsed.dateOnDocument}`);
      }

      // Add provider observation
      if (parsed.providerName) {
        observations.push(`Healthcare provider: ${parsed.providerName}`);
      }

      return {
        extractedText: parsed.extractedText || '',
        extractedData: {
          documentType: parsed.documentType || 'other',
          dateOnDocument: parsed.dateOnDocument,
          providerName: parsed.providerName,
          patientName: parsed.patientName,
          labValues: parsed.labValues,
          medications: parsed.medications,
          diagnoses: parsed.diagnoses,
          procedures: parsed.procedures,
          followUpInstructions: parsed.followUpInstructions,
          keyFindings: parsed.keyFindings,
          rawText: (parsed.extractedText || '').substring(0, 5000), // Store truncated raw text
        },
        observations,
        confidenceScore: parsed.confidenceScore || 0.7,
      };
    }

    throw new Error('Failed to parse AI response');
  } catch (error) {
    console.error('Gemini multimodal analysis error:', error);

    // Return basic extraction on failure
    return {
      extractedText: '',
      extractedData: {
        documentType: 'other',
        keyFindings: ['Document uploaded but automated analysis could not be completed'],
      },
      observations: ['Document uploaded', 'Automated analysis could not be completed - please review manually'],
      confidenceScore: 0.3,
    };
  }
}

/**
 * Main function: Analyze a document
 */
export async function analyzeDocument(
  documentId: string,
  fileUrl: string,
  fileName: string,
  fileType: string,
  userId: string,
  userRole: UserRole,
  groupId: string,
  elderId: string
): Promise<DocumentAnalysis> {
  const startTime = Date.now();

  // Create initial analysis record
  const analysisRef = collection(db, 'documentAnalyses');
  const initialAnalysis: Omit<DocumentAnalysis, 'id'> = {
    userId,
    groupId,
    elderId,
    documentId,
    fileName,
    fileType,
    filePath: fileUrl,
    status: 'processing',
    analysisModel: 'gemini-1.5-pro-multimodal',
    createdAt: new Date(),
  };

  const docRef = await addDoc(analysisRef, initialAnalysis);
  const analysisId = docRef.id;

  try {
    // Log HIPAA disclosure for AI analysis
    await logPHIThirdPartyDisclosure({
      userId,
      userRole,
      groupId,
      elderId,
      serviceName: 'Google Gemini 1.5 Pro (Vertex AI)',
      serviceType: 'document_analysis',
      dataShared: ['document_image', 'document_content'],
      purpose: 'Analyze medical document to extract structured information using multimodal AI',
    });

    // Perform analysis with Gemini multimodal
    const { extractedText, extractedData, observations, confidenceScore } = await analyzeWithGeminiMultimodal(
      fileUrl,
      fileType,
      fileName
    );

    const processingTimeMs = Date.now() - startTime;

    // Update analysis record with results
    const completedAnalysis: Partial<DocumentAnalysis> = {
      status: 'completed',
      extractedText: extractedText.substring(0, 10000), // Limit stored text
      extractedData,
      observations,
      confidenceScore,
      processingTimeMs,
      completedAt: new Date(),
    };

    await updateDoc(doc(db, 'documentAnalyses', analysisId), completedAnalysis);

    return {
      id: analysisId,
      ...initialAnalysis,
      ...completedAnalysis,
    } as DocumentAnalysis;

  } catch (error: any) {
    console.error('Document analysis failed:', error);

    // Update record with error
    const errorUpdate: Partial<DocumentAnalysis> = {
      status: 'failed',
      errorMessage: error.message || 'Document analysis failed',
      completedAt: new Date(),
      processingTimeMs: Date.now() - startTime,
    };

    await updateDoc(doc(db, 'documentAnalyses', analysisId), errorUpdate);

    return {
      id: analysisId,
      ...initialAnalysis,
      ...errorUpdate,
    } as DocumentAnalysis;
  }
}

/**
 * Get analysis for a document
 */
export async function getDocumentAnalysis(
  documentId: string
): Promise<DocumentAnalysis | null> {
  try {
    const analysesRef = collection(db, 'documentAnalyses');
    const q = query(analysesRef, where('documentId', '==', documentId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const docSnap = snapshot.docs[0];
    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      completedAt: docSnap.data().completedAt?.toDate(),
    } as DocumentAnalysis;
  } catch (error) {
    console.error('Error fetching document analysis:', error);
    return null;
  }
}

/**
 * Get all analyses for an elder
 */
export async function getElderDocumentAnalyses(
  elderId: string
): Promise<DocumentAnalysis[]> {
  try {
    const analysesRef = collection(db, 'documentAnalyses');
    const q = query(analysesRef, where('elderId', '==', elderId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      completedAt: docSnap.data().completedAt?.toDate(),
    })) as DocumentAnalysis[];
  } catch (error) {
    console.error('Error fetching elder document analyses:', error);
    return [];
  }
}
