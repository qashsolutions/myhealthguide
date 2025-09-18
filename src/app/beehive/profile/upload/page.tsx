'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBeehiveAuth } from '@/contexts/BeehiveAuthContext';
import { Upload, FileText, X, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function DocumentUploadPage() {
  const router = useRouter();
  const { user } = useBeehiveAuth();
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const documentTypes = [
    {
      value: 'identification',
      label: 'Government ID',
      description: 'Driver\'s license, passport, or state ID',
      icon: '🆔'
    },
    {
      value: 'certification',
      label: 'Professional Certification',
      description: 'CNA, HHA, or other care certifications',
      icon: '📜'
    },
    {
      value: 'background_check',
      label: 'Background Check',
      description: 'Criminal background check results',
      icon: '🔍'
    },
    {
      value: 'insurance',
      label: 'Insurance',
      description: 'Liability or malpractice insurance',
      icon: '🛡️'
    },
    {
      value: 'reference',
      label: 'References',
      description: 'Professional references or letters',
      icon: '📝'
    }
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList).filter(file => {
      // Validate file type and size
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      const maxSize = 20 * 1024 * 1024; // 20MB

      if (!validTypes.includes(file.type)) {
        alert(`${file.name} is not a supported file type`);
        return false;
      }
      if (file.size > maxSize) {
        alert(`${file.name} is too large (max 20MB)`);
        return false;
      }
      return true;
    });

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocuments = async () => {
    if (!user || files.length === 0 || !selectedType) {
      alert('Please select document type and files');
      return;
    }

    setUploading(true);

    try {
      for (const file of files) {
        // Upload to Firebase Storage
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const storageRef = ref(storage, `caregiver-documents/${user.uid}/${fileName}`);

        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Save metadata to Firestore
        await addDoc(collection(db, 'caregiverDocuments', user.uid, 'documents'), {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          documentType: selectedType,
          storageUrl: downloadURL,
          uploadedAt: serverTimestamp(),
          uploadedBy: user.uid,
          processingStatus: 'pending',
          verificationStatus: 'pending_review'
        });

        // Trigger document processing
        // Note: In production, you'd get the ID token from Firebase Auth
        await fetch('/api/documents/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
          },
          body: JSON.stringify({
            documentUrl: downloadURL,
            documentType: selectedType,
            fileName: file.name
          })
        });
      }

      router.push('/beehive/profile?tab=documents');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload documents. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Profile
        </button>

        <div className="bg-white rounded-elder shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Documents</h1>
          <p className="text-gray-600 mb-8">
            Upload your professional documents for verification. All documents are securely stored and encrypted.
          </p>

          {/* Step 1: Select Document Type */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">1. Select Document Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documentTypes.map((type) => (
                <label
                  key={type.value}
                  className={`p-4 border-2 rounded-elder cursor-pointer transition-all ${
                    selectedType === type.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="documentType"
                    value={type.value}
                    checked={selectedType === type.value}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{type.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900">{type.label}</p>
                      <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Step 2: Upload Files */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">2. Upload Files</h2>

            <div
              className={`border-2 border-dashed rounded-elder p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-gray-700 mb-2">
                Drag and drop your files here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                or
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="btn-primary px-6 py-2 rounded-elder cursor-pointer inline-block"
              >
                Browse Files
              </label>
              <p className="text-xs text-gray-500 mt-4">
                Accepted formats: PDF, JPG, PNG (max 20MB each)
              </p>
            </div>

            {/* Files List */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-elder"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-elder p-4 mb-8">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Document Processing</p>
                <p>
                  Your documents will be automatically processed and reviewed by our admin team.
                  You'll receive a notification once verification is complete (usually within 24-48 hours).
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="secondary"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              onClick={uploadDocuments}
              disabled={!selectedType || files.length === 0 || uploading}
            >
              {uploading ? 'Uploading...' : `Upload ${files.length} Document${files.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}