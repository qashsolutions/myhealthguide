'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Trash2, Download, Eye, AlertCircle, FolderOpen } from 'lucide-react';
import { uploadFileWithQuota, getUserFiles, deleteFileWithQuota } from '@/lib/firebase/storage';
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

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user, selectedElder]);

  const loadDocuments = async () => {
    if (!user) return;

    try {
      const allFiles = await getUserFiles(user.uid);

      // Filter by selected elder if one is selected
      const filteredFiles = selectedElder
        ? allFiles.filter(f => f.filePath.includes(selectedElder.id))
        : allFiles;

      setDocuments(filteredFiles);
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError('Failed to load documents');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!selectedElder) {
      setError('Please select an elder first');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const path = `documents/${user.uid}/${selectedElder.id}/${Date.now()}_${file.name}`;
      const result = await uploadFileWithQuota(
        user.uid,
        file,
        path,
        'document',
        user.groups?.[0]
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
      const result = await deleteFileWithQuota(user.uid, doc.filePath);

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
                Please select an elder to manage documents
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
        <label htmlFor="file-upload">
          <Button disabled={uploading} asChild>
            <span>
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Document'}
            </span>
          </Button>
        </label>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
        />
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
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => window.open(doc.filePath, '_blank')}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
