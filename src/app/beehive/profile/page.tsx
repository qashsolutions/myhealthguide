'use client';

import { useState, useEffect } from 'react';
import { useBeehiveAuth } from '@/contexts/BeehiveAuthContext';
import { useRouter } from 'next/navigation';
import {
  User, FileText, Upload, Check, Clock, X,
  AlertCircle, ChevronRight, Download, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ProfilePage() {
  const { user, logOut } = useBeehiveAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);

  // Mock document data - would come from Firestore
  const [documents, setDocuments] = useState([
    {
      id: '1',
      name: 'Driver License',
      type: 'identification',
      uploadDate: '2024-01-15',
      status: 'verified',
      size: '2.3 MB'
    },
    {
      id: '2',
      name: 'CNA Certification',
      type: 'certification',
      uploadDate: '2024-01-16',
      status: 'pending',
      size: '1.8 MB'
    }
  ]);

  useEffect(() => {
    if (!user) {
      router.push('/beehive/auth');
    } else if (user && !user.emailVerified) {
      // Redirect to email verification if not verified
      router.push('/beehive/verify-email');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <Check className="w-4 h-4 mr-1" />
            Verified
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4 mr-1" />
            Pending Review
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <X className="w-4 h-4 mr-1" />
            Needs Update
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white rounded-elder shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-gray-600">{user.email}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {user.role === 'caregiver' ? 'Caregiver' : 'Care Seeker'}
                </p>
              </div>
            </div>
            <Button
              onClick={() => logOut()}
              variant="secondary"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-elder shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('personal')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'personal'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Personal Information
              </button>
              {user.role === 'caregiver' && (
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTab === 'documents'
                      ? 'border-b-2 border-primary-500 text-primary-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Documents
                </button>
              )}
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'settings'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'personal' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input
                      type="text"
                      value={user.firstName || ''}
                      disabled={!isEditing}
                      className="mt-1 input-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <input
                      type="text"
                      value={user.lastName || ''}
                      disabled={!isEditing}
                      className="mt-1 input-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={user.email || ''}
                      disabled
                      className="mt-1 input-base opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      placeholder="Add phone number"
                      disabled={!isEditing}
                      className="mt-1 input-base"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  {isEditing ? (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => setIsEditing(false)}
                        className="mr-3"
                      >
                        Cancel
                      </Button>
                      <Button onClick={() => setIsEditing(false)}>
                        Save Changes
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6">
                {/* Upload Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-elder p-6">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-blue-900">
                        Document Verification Required
                      </h3>
                      <p className="text-sm text-blue-800 mt-1">
                        Upload your certifications, ID, and background check to get verified
                      </p>
                    </div>
                    <Button
                      size="small"
                      onClick={() => router.push('/beehive/profile/upload')}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Documents
                    </Button>
                  </div>
                </div>

                {/* Documents List */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Uploaded Documents
                  </h3>
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-white border border-gray-200 rounded-elder p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-8 h-8 text-gray-400" />
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">
                                {doc.name}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                Uploaded {doc.uploadDate} • {doc.size}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {getStatusBadge(doc.status)}
                            <div className="flex space-x-2">
                              <button className="p-2 hover:bg-gray-100 rounded">
                                <Eye className="w-4 h-4 text-gray-600" />
                              </button>
                              <button className="p-2 hover:bg-gray-100 rounded">
                                <Download className="w-4 h-4 text-gray-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verification Status */}
                <div className="bg-gray-50 rounded-elder p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Verification Status
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Identity Verification</span>
                      {getStatusBadge('verified')}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Background Check</span>
                      {getStatusBadge('pending')}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Professional Certifications</span>
                      {getStatusBadge('pending')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Account Settings
                  </h3>
                  <div className="space-y-4">
                    <button className="w-full text-left px-4 py-3 bg-gray-50 rounded-elder hover:bg-gray-100 transition-colors flex items-center justify-between">
                      <span>Change Password</span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                    <button className="w-full text-left px-4 py-3 bg-gray-50 rounded-elder hover:bg-gray-100 transition-colors flex items-center justify-between">
                      <span>Email Preferences</span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                    <button className="w-full text-left px-4 py-3 bg-gray-50 rounded-elder hover:bg-gray-100 transition-colors flex items-center justify-between">
                      <span>Privacy Settings</span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <button className="text-red-600 hover:text-red-700 font-medium">
                    Delete Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}