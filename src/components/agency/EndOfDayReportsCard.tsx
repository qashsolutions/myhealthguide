'use client';

import { useState, useEffect } from 'react';
import { FileCheck, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import type { Elder } from '@/types';

interface EndOfDayReportsCardProps {
  elders: Elder[];
}

interface ReportStatus {
  sentAt: Date | null;
  status: 'delivered' | 'pending' | 'failed' | 'unknown';
  recipientCount: number;
}

function formatReportDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatReportTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getNextReportTime(): string {
  const now = new Date();
  const hour = now.getHours();
  if (hour < 19) return 'Today at 7:00 PM';
  return 'Tomorrow at 7:00 PM';
}

export function EndOfDayReportsCard({ elders }: EndOfDayReportsCardProps) {
  const [report, setReport] = useState<ReportStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Collect all recipient emails
  const allEmails = elders.flatMap(
    e => e.reportRecipients?.map(r => r.email).filter(Boolean) || []
  );
  const uniqueEmails = [...new Set(allEmails)];

  useEffect(() => {
    if (uniqueEmails.length === 0) {
      setLoading(false);
      return;
    }

    const fetchLastReport = async () => {
      try {
        // Query mail collection for the latest sent report
        // Firebase Trigger Email uses 'mail' collection with 'delivery' field
        const mailQ = query(
          collection(db, 'mail'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );

        const snapshot = await getDocs(mailQ);

        let found = false;
        for (const doc of snapshot.docs) {
          const data = doc.data();
          const recipients = data.to || [];
          // Check if any of our report emails are in the recipients
          const hasMatch = recipients.some((email: string) =>
            uniqueEmails.includes(email)
          );

          if (hasMatch) {
            const sentAt = data.createdAt?.toDate?.() || null;
            const deliveryState = data.delivery?.state || 'PENDING';
            const status: ReportStatus['status'] =
              deliveryState === 'SUCCESS' ? 'delivered' :
              deliveryState === 'ERROR' ? 'failed' :
              'pending';

            setReport({
              sentAt,
              status,
              recipientCount: recipients.length,
            });
            found = true;
            break;
          }
        }

        if (!found) {
          setReport(null);
        }
      } catch (error) {
        console.error('[EndOfDayReportsCard] Error fetching report status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLastReport();
  }, [uniqueEmails.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (uniqueEmails.length === 0) return null;

  const statusDisplay = {
    delivered: { icon: 'checkmark', text: 'Delivered', color: 'text-green-600 dark:text-green-400' },
    pending: { icon: 'clock', text: 'Pending', color: 'text-amber-600 dark:text-amber-400' },
    failed: { icon: 'x', text: 'Failed', color: 'text-red-600 dark:text-red-400' },
    unknown: { icon: 'question', text: 'Unknown', color: 'text-gray-500 dark:text-gray-400' },
  };

  return (
    <Card className="p-4 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
      <div className="flex items-start gap-3">
        <FileCheck className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            End of Day Reports
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Auto-sent daily at 7 PM PST to member emails listed above.
          </p>

          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400 mt-2" />
          ) : report?.sentAt ? (
            <div className="mt-2 space-y-1 text-xs">
              <div className="text-gray-600 dark:text-gray-400">
                Last sent: {formatReportDate(report.sentAt)} · {formatReportTime(report.sentAt)}
              </div>
              <div className={statusDisplay[report.status].color}>
                Status: {report.status === 'delivered' ? '\u2713' : ''} {statusDisplay[report.status].text}
                {report.recipientCount > 0 && ` (${report.recipientCount} recipient${report.recipientCount > 1 ? 's' : ''})`}
              </div>
              <div className="text-gray-500 dark:text-gray-400">
                Next report: {getNextReportTime()}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              No reports sent yet. Next report: {getNextReportTime()}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
