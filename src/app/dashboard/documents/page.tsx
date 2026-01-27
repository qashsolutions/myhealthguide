'use client';

/**
 * DOCUMENTS PAGE - Simple document storage for agency owners
 *
 * Features:
 * - Upload documents (PDF, images, Word, Excel)
 * - Add/edit one-line description for each document
 * - Sort by name or date
 * - Delete documents
 *
 * Updated: Jan 26, 2026 - Removed category filters, added description field
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Upload, Trash2, AlertCircle, FolderOpen, HardDrive, ArrowUpDown, Pencil, Check, X } from 'lucide-react';
import { uploadFileWithQuota, deleteFileWithQuota } from '@/lib/firebase/storage';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import type { StorageMetadata } from '@/types';
import { format } from 'date-fns';

type SortOption = 'name_asc' | 'name_desc' | 'date_asc' | 'date_desc';

export default function DocumentsPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const [documents, setDocuments] = useState<(StorageMetadata & { description?: string })[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [storageInfo, setStorageInfo] = useState<{ used: number; limit: number; isOverQuota: boolean } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');

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
      }
    } catch (err: any) {
      setError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
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

  const handleSaveDescription = async (docId: string) => {
    try {
      const response = await authenticatedFetch('/api/documents/description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId, description: editDescription })
      });

      if (response.ok) {
        setDocuments(docs => docs.map(d =>
          d.id === docId ? { ...d, description: editDescription } : d
        ));
        setEditingId(null);
        setEditDescription('');
      } else {
        setError('Failed to save description');
      }
    } catch (err) {
      setError('Failed to save description');
    }
  };

  const getDocumentIcon = (fileType: string) => {
    if (fileType?.startsWith('image/')) return '🖼️';
    if (fileType?.includes('pdf')) return '📄';
    if (fileType?.includes('word') || fileType?.includes('document')) return '📝';
    if (fileType?.includes('sheet') || fileType?.includes('excel')) return '📊';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Sort documents
  const sortedDocuments = [...documents].sort((a, b) => {
    switch (sortBy) {
      case 'name_asc':
        return (a.fileName || '').localeCompare(b.fileName || '');
      case 'name_desc':
        return (b.fileName || '').localeCompare(a.fileName || '');
      case 'date_asc':
        return (a.uploadedAt?.getTime() || 0) - (b.uploadedAt?.getTime() || 0);
      case 'date_desc':
      default:
        return (b.uploadedAt?.getTime() || 0) - (a.uploadedAt?.getTime() || 0);
    }
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
            Store documents for {selectedElder.name}
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
                  {uploading ? 'Uploading...' : storageInfo?.isOverQuota ? 'Storage Over Limit' : 'Upload'}
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
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Storage Over Quota Warning */}
      {storageInfo?.isOverQuota && (
        <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <HardDrive className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <div className="font-medium mb-1">Storage Over Limit</div>
            <p className="text-sm">
              You&apos;re using {formatFileSize(storageInfo.used)} of {formatFileSize(storageInfo.limit)}.
              {' '}Delete {formatFileSize(storageInfo.used - storageInfo.limit)} of files to upload more.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Storage Usage + Sort */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Storage Used</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatFileSize(storageInfo?.used || 0)} / {formatFileSize(storageInfo?.limit || 500 * 1024 * 1024)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Files</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{documents.length}</p>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-sm border rounded-md px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="name_asc">Name A-Z</option>
                <option value="name_desc">Name Z-A</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No documents uploaded yet
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
            <div className="space-y-3">
              {sortedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  {/* Icon */}
                  <div className="text-2xl flex-shrink-0">{getDocumentIcon(doc.fileType)}</div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {doc.fileName}
                    </p>

                    {/* Description */}
                    {editingId === doc.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Add a description..."
                          className="h-7 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveDescription(doc.id!);
                            if (e.key === 'Escape') { setEditingId(null); setEditDescription(''); }
                          }}
                        />
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveDescription(doc.id!)}>
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingId(null); setEditDescription(''); }}>
                          <X className="w-4 h-4 text-gray-400" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {doc.description || <span className="italic">No description</span>}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
                          onClick={() => { setEditingId(doc.id!); setEditDescription(doc.description || ''); }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    <p className="text-xs text-gray-400 mt-1">
                      {formatFileSize(doc.fileSize)} • Uploaded {doc.uploadedAt ? format(doc.uploadedAt, 'MMM d, yyyy') : 'Unknown'}
                    </p>
                  </div>

                  {/* Delete Button */}
                  {!isReadOnly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(doc)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
