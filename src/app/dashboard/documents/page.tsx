'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Upload, Trash2, Eye, AlertCircle, FolderOpen, Sparkles, X, HardDrive } from 'lucide-react';
import { uploadFileWithQuota, deleteFileWithQuota } from '@/lib/firebase/storage';
import { DocumentAnalysisPanel } from '@/components/documents/DocumentAnalysisPanel';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import type { StorageMetadata } from '@/types';
import { format } from 'date-fns';

type DocumentCategory = 'medical' | 'insurance' | 'legal' | 'care_plan' | 'other';

export default function DocumentsPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const [documents, setDocuments] = useState<StorageMetadata[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [selectedDocument, setSelectedDocument] = useState<StorageMetadata | null>(null);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ used: number; limit: number; isOverQuota: boolean } | null>(null);

  // DISABLED: Legacy family_member role check - family members now use Report Recipients (email-only, no accounts)
  // Family members no longer have app access, so this is always false
  // const userAgencyRole = user?.agencies?.[0]?.role;
  // const isReadOnly = userAgencyRole === 'family_member';
  const isReadOnly = false; // Only owner has access to documents page now

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedElder]);

  const loadDocuments = async () => {
    if (!user) return;

    try {
      const params = new URLSearchParams();
      if (selectedElder) {
        params.set('elderId', selectedElder.id);
      }

      const response = await authenticatedFetch(`/api/documents?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        const docs = data.documents.map((d: any) => ({
          ...d,
          uploadedAt: d.uploadedAt ? new Date(d.uploadedAt) : null
        }));
        setDocuments(docs);
        if (data.storageInfo) {
          setStorageInfo(data.storageInfo);
        }
      } else {
        console.error('Error loading documents:', data.error);
        setError('Failed to load documents');
      }
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError('Failed to load documents');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!selectedElder) {
      setError('Please select a loved one first');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const path = `documents/${user.id}/${selectedElder.id}/${Date.now()}_${file.name}`;
      const result = await uploadFileWithQuota(
        user.id,
        file,
        path,
        'document',
        user.groups?.[0]?.groupId
      );

      if (!result.success) {
        setError(result.error || 'Upload failed');
      } else {
        await loadDocuments();
        // TODO: Send notification to admin about new document
      }
    } catch (err: any) {
      setError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: StorageMetadata) => {
    if (!user || !confirm('Are you sure you want to delete this document?')) return;

    try {
      const result = await deleteFileWithQuota(user.id, doc.filePath);

      if (result.success) {
        await loadDocuments();
      } else {
        setError(result.error || 'Delete failed');
      }
    } catch (err: any) {
      setError('Delete failed: ' + err.message);
    }
  };

  const getDocumentIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
    return '📎';
  };

  const canAnalyzeDocument = (fileType: string) => {
    return ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/tiff'].includes(fileType);
  };

  const handleAnalyzeDocument = (doc: StorageMetadata) => {
    setSelectedDocument(doc);
    setShowAnalysisDialog(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const filteredDocuments = selectedCategory === 'all'
    ? documents
    : documents.filter(doc => {
        const fileName = doc.fileName.toLowerCase();
        if (selectedCategory === 'medical') return fileName.includes('medical') || fileName.includes('prescription') || fileName.includes('lab');
        if (selectedCategory === 'insurance') return fileName.includes('insurance') || fileName.includes('policy');
        if (selectedCategory === 'legal') return fileName.includes('legal') || fileName.includes('will') || fileName.includes('poa');
        if (selectedCategory === 'care_plan') return fileName.includes('care') || fileName.includes('plan');
        return false;
      });

  if (!selectedElder) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8">
          <CardContent>
            <div className="text-center">
              <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-center text-gray-600 dark:text-gray-400">
                Please select a loved one to manage documents
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Documents
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage documents for {selectedElder.name}
          </p>
        </div>
        {!isReadOnly && (
          <>
            <label htmlFor="file-upload">
              <Button
                disabled={uploading || storageInfo?.isOverQuota}
                asChild
                title={storageInfo?.isOverQuota ? 'Storage over limit - delete files first' : 'Upload a document'}
              >
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : storageInfo?.isOverQuota ? 'Storage Over Limit' : 'Upload Document'}
                </span>
              </Button>
            </label>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={storageInfo?.isOverQuota}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
            />
          </>
        )}
      </div>

      {error && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Storage Over Quota Warning */}
      {storageInfo?.isOverQuota && (
        <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <HardDrive className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <div className="font-medium mb-1">Storage Over Limit</div>
            <p className="text-sm">
              You&apos;re using {formatFileSize(storageInfo.used)} of {formatFileSize(storageInfo.limit)}.
              {' '}Delete {formatFileSize(storageInfo.used - storageInfo.limit)} of files to view or upload documents.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Category Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              All Documents
            </Button>
            <Button
              variant={selectedCategory === 'medical' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('medical')}
            >
              Medical Records
            </Button>
            <Button
              variant={selectedCategory === 'insurance' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('insurance')}
            >
              Insurance
            </Button>
            <Button
              variant={selectedCategory === 'legal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('legal')}
            >
              Legal Documents
            </Button>
            <Button
              variant={selectedCategory === 'care_plan' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('care_plan')}
            >
              Care Plans
            </Button>
            <Button
              variant={selectedCategory === 'other' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('other')}
            >
              Other
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Storage Usage */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Storage Used</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatFileSize(documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0))} / {user?.storageLimit ? formatFileSize(user.storageLimit) : '25 MB'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Files</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{documents.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Document Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {selectedCategory === 'all' ? 'No documents uploaded yet' : `No ${selectedCategory.replace('_', ' ')} documents found`}
              </p>
              {!isReadOnly && (
                <>
                  <label htmlFor="file-upload-empty">
                    <Button variant="outline" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Your First Document
                      </span>
                    </Button>
                  </label>
                  <input
                    id="file-upload-empty"
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                  />
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {/* File Icon and Name */}
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">{getDocumentIcon(doc.fileType)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {doc.fileName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(doc.fileSize)}
                          </p>
                        </div>
                      </div>

                      {/* Upload Date */}
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Uploaded {format(doc.uploadedAt, 'MMM d, yyyy')}
                      </p>

                      {/* Actions */}
                      {/* REMOVED: View and Analyze with AI buttons (Jan 26, 2026)
                          Reason: Document storage is sufficient - agency owners just need to store
                          and retrieve documents, not view them in-app or analyze with AI.
                          The delete button remains for file management.
                      */}
                      <div className="flex gap-2">
                        {!isReadOnly && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(doc)}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* REMOVED: Document Analysis Dialog (Jan 26, 2026)
          Reason: Document storage is sufficient - AI analysis feature not needed.
          Keeping code commented for potential future use.
      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Document Analysis
              </DialogTitle>
            </div>
            {selectedDocument && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedDocument.fileName}
              </p>
            )}
          </DialogHeader>

          {selectedDocument && user && selectedElder && (
            <DocumentAnalysisPanel
              documentId={selectedDocument.id!}
              fileName={selectedDocument.fileName}
              fileType={selectedDocument.fileType}
              filePath={selectedDocument.filePath}
              fileSize={selectedDocument.fileSize}
              userId={user.id}
              groupId={user.groups?.[0]?.groupId || ''}
              elderId={selectedElder.id!}
              onAnalysisComplete={() => {
                // Could refresh documents or show notification
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      */}
    </div>
  );
}
