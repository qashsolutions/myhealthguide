'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Heart,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface InviteData {
  email: string;
  name?: string;
  caregiverName: string;
  groupName: string;
  elderCount: number;
  expiresAt: string;
}

function CaregiverFamilyInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (token) {
      verifyInvite();
    } else {
      setError('No invite token provided');
      setLoading(false);
    }
  }, [token]);

  const verifyInvite = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/caregiver/invite-member/verify?token=${token}`);
      const data = await response.json();

      if (!response.ok || !data.valid) {
        setError(data.error || 'Invalid or expired invite');
        return;
      }

      setInviteData(data.invite);

      // Store token for after signup
      sessionStorage.setItem('caregiverFamilyInviteToken', token!);

    } catch (err: any) {
      setError(err.message || 'Failed to verify invite');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!user) {
      // Redirect to signup with return URL
      router.push(`/signup?returnUrl=${encodeURIComponent(`/caregiver-family-invite?token=${token}`)}`);
      return;
    }

    try {
      setAccepting(true);
      setError(null);

      const { auth } = await import('@/lib/firebase/config');
      const authToken = await auth.currentUser?.getIdToken();

      if (!authToken) {
        setError('Please sign in to accept this invite');
        return;
      }

      const response = await fetch('/api/caregiver/invite-member/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invite');
      }

      setAccepted(true);
      sessionStorage.removeItem('caregiverFamilyInviteToken');

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  };

  // Check for stored token after signup
  useEffect(() => {
    if (user && !authLoading && !accepted) {
      const storedToken = sessionStorage.getItem('caregiverFamilyInviteToken');
      if (storedToken && storedToken === token && inviteData) {
        // Auto-accept after signup
        handleAcceptInvite();
      }
    }
  }, [user, authLoading, inviteData]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Verifying invite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please ask your caregiver for a new invite link.
            </p>
            <Link href="/">
              <Button variant="outline">Go to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Welcome to the Care Team!</CardTitle>
            <CardDescription>
              You can now view care updates from {inviteData?.caregiverName}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Redirecting to your dashboard...
            </p>
            <Link href="/dashboard">
              <Button>
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle>You&apos;re Invited!</CardTitle>
          <CardDescription>
            {inviteData?.caregiverName} has invited you to join their care team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Group</span>
              <span className="font-medium">{inviteData?.groupName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Invited by</span>
              <span className="font-medium">{inviteData?.caregiverName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Elders you can view</span>
              <Badge variant="secondary">{inviteData?.elderCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Your access</span>
              <Badge variant="outline" className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Viewer (read-only)
              </Badge>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">As a family viewer, you can:</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <li>- View care updates and logs</li>
              <li>- See medication schedules</li>
              <li>- Receive push notifications</li>
              <li>- Access care reports</li>
            </ul>
          </div>

          {user ? (
            <Button
              className="w-full"
              onClick={handleAcceptInvite}
              disabled={accepting}
            >
              {accepting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Accept & Join Care Team
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => router.push(`/signup?returnUrl=${encodeURIComponent(`/caregiver-family-invite?token=${token}`)}`)}
              >
                Create Account to Join
              </Button>
              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link href={`/login?returnUrl=${encodeURIComponent(`/caregiver-family-invite?token=${token}`)}`} className="text-blue-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CaregiverFamilyInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <CaregiverFamilyInviteContent />
    </Suspense>
  );
}
