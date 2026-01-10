'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  History,
  ArrowRight,
  X,
  Clock,
  User,
  Laptop,
  Smartphone
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPreviousSessionForUser,
  clearSessionContinuityOffer,
  getPageDisplayName,
  type SessionContinuityData
} from '@/lib/session/sessionManager';
import { formatDistanceToNow } from 'date-fns';

export function ContinueSessionDialog() {
  const router = useRouter();
  const { user } = useAuth();
  const [previousSession, setPreviousSession] = useState<SessionContinuityData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check for previous session on mount
  useEffect(() => {
    const checkPreviousSession = async () => {
      if (!user?.id) return;

      // Only check once per session (use sessionStorage to track)
      const checkedKey = `session_continuity_checked_${user.id}`;
      if (sessionStorage.getItem(checkedKey)) return;
      sessionStorage.setItem(checkedKey, 'true');

      try {
        const session = await getPreviousSessionForUser(user.id);
        if (session) {
          setPreviousSession(session);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Error checking previous session:', error);
      }
    };

    // Small delay to let the page settle
    const timer = setTimeout(checkPreviousSession, 1000);
    return () => clearTimeout(timer);
  }, [user?.id]);

  const handleContinue = async () => {
    if (!previousSession || !user?.id) return;

    setIsLoading(true);
    try {
      await clearSessionContinuityOffer(user.id);
      setIsOpen(false);
      router.push(previousSession.lastPage);
    } catch (error) {
      console.error('Error continuing session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!user?.id) return;

    try {
      await clearSessionContinuityOffer(user.id);
    } catch (error) {
      console.error('Error dismissing session offer:', error);
    }
    setIsOpen(false);
  };

  if (!previousSession) return null;

  const pageName = getPageDisplayName(previousSession.lastPage);
  const timeAgo = formatDistanceToNow(previousSession.lastActivity, { addSuffix: true });
  const isMobile = previousSession.deviceInfo.platform.toLowerCase().includes('mobile') ||
                   previousSession.deviceInfo.platform.toLowerCase().includes('iphone') ||
                   previousSession.deviceInfo.platform.toLowerCase().includes('android');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-2">
            <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <DialogTitle className="text-center">Continue Where You Left Off?</DialogTitle>
          <DialogDescription className="text-center">
            We found your previous session from another device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Previous session info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            {/* Page */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Last page</p>
                <p className="font-medium text-gray-900 dark:text-white">{pageName}</p>
              </div>
            </div>

            {/* Elder */}
            {previousSession.lastElderName && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loved one</p>
                  <p className="font-medium text-gray-900 dark:text-white">{previousSession.lastElderName}</p>
                </div>
              </div>
            )}

            {/* Time and device */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                {isMobile ? (
                  <Smartphone className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Laptop className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isMobile ? 'Mobile device' : 'Desktop'} • {timeAgo}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Start Fresh
          </Button>
          <Button
            onClick={handleContinue}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>Loading...</>
            ) : (
              <>
                <ArrowRight className="w-4 h-4 mr-2" />
                Continue
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
