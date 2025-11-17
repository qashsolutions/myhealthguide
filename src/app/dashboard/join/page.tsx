'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GroupService } from '@/lib/firebase/groups';
import { useAuth } from '@/contexts/AuthContext';
import { unformatInviteCode, validateInviteCodeFormat } from '@/lib/utils/inviteCode';
import { UserPlus, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function JoinGroupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in to join a group');
      return;
    }

    // Remove formatting and validate
    const plainCode = unformatInviteCode(inviteCode);

    if (!validateInviteCodeFormat(plainCode)) {
      setError('Invalid invite code format. Code should be 6 alphanumeric characters (e.g., ABC123 or ABC-123)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Find group by invite code
      const groupId = await GroupService.findGroupByInviteCode(plainCode);

      if (!groupId) {
        setError('Invalid invite code. Please check the code and try again.');
        setLoading(false);
        return;
      }

      // Verify invite code (double check expiry)
      const isValid = await GroupService.verifyInviteCode(groupId, plainCode);

      if (!isValid) {
        setError('This invite code has expired. Please request a new code from the group admin.');
        setLoading(false);
        return;
      }

      // Create pending approval
      await GroupService.createPendingApproval(
        groupId,
        user.id,
        `${user.firstName} ${user.lastName}`,
        user.email,
        user.phoneNumber
      );

      setSuccess(true);

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (err: any) {
      console.error('Error joining group:', err);
      setError(err.message || 'Failed to send join request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatInput = (value: string) => {
    // Remove all non-alphanumeric characters and convert to uppercase
    const clean = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();

    // Limit to 6 characters
    const limited = clean.slice(0, 6);

    // Add dash after 3 characters for display
    if (limited.length > 3) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    }

    return limited;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatInput(e.target.value);
    setInviteCode(formatted);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center p-12">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>You must be logged in to join a group</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center p-12">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-center">Request Sent!</CardTitle>
            <CardDescription className="text-center">
              Your join request has been sent to the group admin for approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                  You'll be notified once the admin approves your request. This usually happens within 24 hours.
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserPlus className="w-8 h-8 text-blue-600" />
            Join a Group
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Enter the invite code shared by your group admin
          </p>
        </div>
      </div>

      {/* Join Form */}
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Enter Invite Code</CardTitle>
          <CardDescription>
            The code is a 6-character alphanumeric code (e.g., ABC-123)
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="invite-code" className="text-sm font-medium">
                Invite Code
              </label>
              <Input
                id="invite-code"
                type="text"
                placeholder="ABC-123"
                value={inviteCode}
                onChange={handleInputChange}
                className="text-center text-2xl font-bold tracking-wider uppercase"
                disabled={loading}
                maxLength={7} // 6 chars + 1 dash
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enter the 6-digit code shared with you by the group admin
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading || inviteCode.length < 6}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Request...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Request to Join
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
              How it works:
            </p>
            <ol className="text-xs text-gray-700 dark:text-gray-300 space-y-1 list-decimal list-inside">
              <li>Enter the invite code shared by your group admin</li>
              <li>Your join request will be sent for approval</li>
              <li>The admin will review and approve your request</li>
              <li>You'll get read-only access by default</li>
              <li>Admin can grant you write permission if needed</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
