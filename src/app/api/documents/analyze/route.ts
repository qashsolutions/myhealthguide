/**
 * Document Analysis API Route
 *
 * POST /api/documents/analyze
 * Analyzes an uploaded document using OCR and MedGemma AI
 *
 * GET /api/documents/analyze?documentId=xxx
 * Gets existing analysis for a document
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeDocument, getDocumentAnalysis } from '@/lib/ai/documentAnalysis';
import { verifyAndLogAccess } from '@/lib/consent/unifiedConsentManagement';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage, db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

// Maximum file size for analysis (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Supported file types
const SUPPORTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
];

/**
 * GET - Retrieve existing analysis for a document
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    const analysis = await getDocumentAnalysis(documentId);

    if (!analysis) {
      return NextResponse.json(
        { error: 'No analysis found for this document' },
        { status: 404 }
      );
    }

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error('Error fetching document analysis:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}

/**
 * POST - Analyze a document
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      documentId,
      filePath,
      fileName,
      fileType,
      fileSize,
      userId,
      groupId,
      elderId,
    } = body;

    // Validate required fields
    if (!documentId || !filePath || !fileName || !fileType || !userId || !groupId || !elderId) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId, filePath, fileName, fileType, userId, groupId, elderId' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!SUPPORTED_TYPES.includes(fileType)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${fileType}. Supported types: PDF, JPEG, PNG, WebP, TIFF`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (fileSize && fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size for analysis is 10MB.' },
        { status: 400 }
      );
    }

    // Check unified AI consent
    const consentCheck = await verifyAndLogAccess(
      userId,
      groupId,
      'document_analysis',
      elderId
    );

    if (!consentCheck.allowed) {
      return NextResponse.json(
        {
          error: 'AI consent required',
          reason: consentCheck.reason,
          requiresConsent: true,
        },
        { status: 403 }
      );
    }

    // Get user role from Firestore
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    const userRole = userData?.role || 'member';

    // Get download URL for the file
    let fileUrl: string;
    try {
      const storageRef = ref(storage, filePath);
      fileUrl = await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error getting file URL:', error);
      return NextResponse.json(
        { error: 'Could not access the document file' },
        { status: 404 }
      );
    }

    // Check if analysis already exists
    const existingAnalysis = await getDocumentAnalysis(documentId);
    if (existingAnalysis && existingAnalysis.status === 'completed') {
      return NextResponse.json({
        analysis: existingAnalysis,
        message: 'Analysis already exists for this document',
        cached: true,
      });
    }

    // Perform analysis
    const analysis = await analyzeDocument(
      documentId,
      fileUrl,
      fileName,
      fileType,
      userId,
      userRole,
      groupId,
      elderId
    );

    if (analysis.status === 'failed') {
      return NextResponse.json(
        {
          error: analysis.errorMessage || 'Document analysis failed',
          analysis,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      analysis,
      message: 'Document analyzed successfully',
    });
  } catch (error: any) {
    console.error('Document analysis API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze document' },
      { status: 500 }
    );
  }
}
