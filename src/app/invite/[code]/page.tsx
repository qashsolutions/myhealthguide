'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InviteService, InviteCode } from '@/lib/firebase/invites';
import { Heart, Users, Shield, CheckCircle, XCircle, Loader, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function InviteAcceptPage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const [invite, setInvite] = useState<InviteCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Mock user - replace with actual auth
  const currentUser = {
    id: 'mock-user-id',
    name: 'Current User',
    isAuthenticated: false // Set to true when user is logged in
  };

  useEffect(() => {
    validateInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.code]);

  const validateInvite = async () => {
    try {
      setLoading(true);
      const validation = await InviteService.validateInvite(params.code);

      if (!validation.valid) {
        setError(validation.reason || 'Invalid invite code');
      } else {
        setInvite(validation.invite!);
      }
    } catch (err) {
      setError('Failed to load invite. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!currentUser.isAuthenticated) {
      // Redirect to signup with invite code
      router.push(`/signup?invite=${params.code}`);
      return;
    }

    setAccepting(true);
    setError('');

    try {
      const result = await InviteService.acceptInvite({
        inviteCode: params.code,
        userId: currentUser.id,
        userName: currentUser.name
      });

      if (!result.success) {
        setError(result.error || 'Failed to accept invite');
        setAccepting(false);
        return;
      }

      setSuccess(true);

      // Redirect to group dashboard after 2 seconds
      setTimeout(() => {
        router.push(`/dashboard?group=${result.groupId}`);
      }, 2000);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-center">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">
                Go to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-center">Welcome to the Group!</CardTitle>
            <CardDescription className="text-center">
              You&apos;ve successfully joined {invite?.groupName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Redirecting to dashboard...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
              <Heart className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-center">You&apos;re Invited!</CardTitle>
          <CardDescription className="text-center">
            Join {invite?.groupName} on myguide.health
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invite Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">Group Name</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {invite?.groupName}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">Your Role</span>
              <Badge variant={invite?.role === 'admin' ? 'default' : 'secondary'}>
                {invite?.role === 'admin' ? (
                  <>
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </>
                ) : (
                  <>
                    <Users className="w-3 h-3 mr-1" />
                    Member
                  </>
                )}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">Invited By</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {invite?.createdByName}
              </span>
            </div>

            {invite && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-400">Expires</span>
                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-3 h-3" />
                  {new Date(invite.expiresAt).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Accept Button */}
          <div className="space-y-3">
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full"
              size="lg"
            >
              {accepting ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : currentUser.isAuthenticated ? (
                'Accept Invitation'
              ) : (
                'Sign Up to Accept'
              )}
            </Button>

            {!currentUser.isAuthenticated && (
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                Already have an account?{' '}
                <Link href={`/login?invite=${params.code}`} className="text-blue-600 hover:underline">
                  Sign in
                </Link>
              </p>
            )}
          </div>

          {/* Info Card */}
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>What is myguide.health?</strong>
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              A caregiving platform to help families coordinate medication, diet, and supplement tracking for their loved ones.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
