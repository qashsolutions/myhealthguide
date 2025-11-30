/**
 * Document Analysis API Route
 *
 * POST /api/documents/analyze
 * Analyzes an uploaded document using OCR and MedGemma AI
 *
 * GET /api/documents/analyze?documentId=xxx
 * Gets existing analysis for a document
 *
 * AUTHENTICATION: Requires Firebase ID token in Authorization header
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeDocument } from '@/lib/ai/documentAnalysis';
import {
  verifyAuthToken,
  canAccessElderProfileServer,
  verifyAndLogAccessServer,
  getUserDataServer,
} from '@/lib/api/verifyAuth';
import { getDocumentAnalysisServer } from '@/lib/api/firestoreAdmin';
import { getAdminDb } from '@/lib/firebase/admin';

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
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    const analysis = await getDocumentAnalysisServer(documentId);

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
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const body = await request.json();
    const {
      documentId,
      filePath,
      fileName,
      fileType,
      fileSize,
      groupId,
      elderId,
    } = body;

    // Validate required fields
    if (!documentId || !filePath || !fileName || !fileType || !groupId || !elderId) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId, filePath, fileName, fileType, groupId, elderId' },
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

    // Verify user has access to this elder
    const hasAccess = await canAccessElderProfileServer(userId, elderId, groupId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to access this elder\'s data' },
        { status: 403 }
      );
    }

    // Check unified AI consent
    const consentCheck = await verifyAndLogAccessServer(
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

    // Get user role
    const userData = await getUserDataServer(userId);
    const userRole = userData?.role || 'member';

    // Get download URL for the file using Admin SDK
    // Note: For storage, we need to construct the URL or use a signed URL
    // The file should already be uploaded and accessible
    const fileUrl = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(filePath)}?alt=media`;

    // Check if analysis already exists
    const existingAnalysis = await getDocumentAnalysisServer(documentId);
    if (existingAnalysis && (existingAnalysis as any).status === 'completed') {
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
