'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  HeartHandshake,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Building2,
  Shield,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

function CaregiverInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<{
    agencyName: string;
    phoneNumber: string;
    status: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyInvite = async () => {
      if (!token) {
        setError('Invalid invite link. No token provided.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/caregiver-invite/verify?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Invalid invite');
          setLoading(false);
          return;
        }

        setInvite(data.invite);
      } catch (err) {
        setError('Failed to verify invite. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    verifyInvite();
  }, [token]);

  const handleSignUp = () => {
    // Store the invite token in sessionStorage so we can use it after signup
    if (token) {
      sessionStorage.setItem('caregiverInviteToken', token);
    }
    router.push('/phone-signup?role=caregiver');
  };

  const handleLogin = () => {
    if (token) {
      sessionStorage.setItem('caregiverInviteToken', token);
    }
    router.push('/phone-login?role=caregiver');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">Verifying your invite...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-2xl">Invalid Invite</CardTitle>
            <CardDescription className="text-base">{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600 dark:text-gray-400">
              This invite link may have expired or been cancelled. Please contact the agency administrator for a new invite.
            </p>
            <div className="flex justify-center">
              <Link href="/">
                <Button variant="outline">Go to Homepage</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite?.status === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <CardTitle className="text-2xl">Already Accepted</CardTitle>
            <CardDescription className="text-base">
              This invite has already been accepted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <Link href="/phone-login">
                <Button>Sign In</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = invite?.expiresAt && new Date(invite.expiresAt) < new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Clock className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <CardTitle className="text-2xl">Invite Expired</CardTitle>
            <CardDescription className="text-base">
              This invite link has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600 dark:text-gray-400">
              Please contact the agency administrator for a new invite.
            </p>
            <div className="flex justify-center">
              <Link href="/">
                <Button variant="outline">Go to Homepage</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <HeartHandshake className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <Badge className="mb-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Valid Invite
            </Badge>
            <CardTitle className="text-2xl">You're Invited!</CardTitle>
            <CardDescription className="text-base mt-2">
              You've been invited to join as a caregiver
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Agency Info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Agency</p>
                <p className="font-semibold text-lg">{invite?.agencyName || 'Healthcare Agency'}</p>
              </div>
            </div>
          </div>

          {/* What happens next */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-white">What happens next:</h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">1</span>
                </div>
                <p>Sign up using the phone number <strong>{invite?.phoneNumber}</strong></p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">2</span>
                </div>
                <p>Complete your caregiver profile (required)</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">3</span>
                </div>
                <p>The agency admin will assign you to elders</p>
              </div>
            </div>
          </div>

          {/* Important note about phone number */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Important:</strong> You must sign up with the phone number{' '}
                <span className="font-mono bg-yellow-100 dark:bg-yellow-800 px-1 rounded">
                  {invite?.phoneNumber}
                </span>{' '}
                to be linked to this agency.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleSignUp}
              className="w-full"
              size="lg"
            >
              Create Account
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              onClick={handleLogin}
              variant="outline"
              className="w-full"
            >
              I already have an account
            </Button>
          </div>

          {/* Expires info */}
          {invite?.expiresAt && (
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              This invite expires on{' '}
              {new Date(invite.expiresAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CaregiverInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <CaregiverInviteContent />
    </Suspense>
  );
}
