'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  sendMedicationReminder,
  sendMissedDoseAlert,
  sendDailySummary,
  sendComplianceAlert,
  validatePhoneForSMS
} from '@/lib/sms/twilioService';
import { MessageSquare, Send, CheckCircle, XCircle } from 'lucide-react';

export default function TestSMSPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{ type: string; success: boolean; message: string }[]>([]);

  const handleSendTest = async (type: 'reminder' | 'missed' | 'summary' | 'alert') => {
    if (!phoneNumber) {
      alert('Please enter a phone number');
      return;
    }

    if (!validatePhoneForSMS(phoneNumber)) {
      alert('Please enter a valid US phone number');
      return;
    }

    setSending(true);

    try {
      let result;

      switch (type) {
        case 'reminder':
          result = await sendMedicationReminder({
            to: phoneNumber,
            elderName: 'John Smith',
            medicationName: 'Lisinopril 10mg',
            scheduledTime: '9:00 AM'
          });
          break;

        case 'missed':
          result = await sendMissedDoseAlert({
            to: phoneNumber,
            elderName: 'John Smith',
            medicationName: 'Lisinopril 10mg',
            missedTime: '9:00 AM'
          });
          break;

        case 'summary':
          result = await sendDailySummary({
            to: phoneNumber,
            elderName: 'John Smith',
            complianceRate: 85
          });
          break;

        case 'alert':
          result = await sendComplianceAlert({
            to: phoneNumber,
            elderName: 'John Smith',
            complianceRate: 65
          });
          break;
      }

      setResults([
        {
          type,
          success: result.success,
          message: result.success
            ? `Sent successfully (ID: ${result.messageId})`
            : `Failed: ${result.error}`
        },
        ...results
      ]);

    } catch (error) {
      setResults([
        {
          type,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        ...results
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Test SMS Notifications
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Send test notifications to verify Twilio integration
        </p>
      </div>

      {/* Phone Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Test Phone Number
          </CardTitle>
          <CardDescription>
            Enter a phone number to receive test SMS notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number (US)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Format: (555) 123-4567 or 5551234567
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Send Test Messages</CardTitle>
          <CardDescription>
            Click a button to send a test notification of that type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => handleSendTest('reminder')}
              disabled={sending || !phoneNumber}
              className="h-20 flex flex-col items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              <span>Medication Reminder</span>
            </Button>

            <Button
              onClick={() => handleSendTest('missed')}
              disabled={sending || !phoneNumber}
              variant="destructive"
              className="h-20 flex flex-col items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              <span>Missed Dose Alert</span>
            </Button>

            <Button
              onClick={() => handleSendTest('summary')}
              disabled={sending || !phoneNumber}
              variant="secondary"
              className="h-20 flex flex-col items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              <span>Daily Summary</span>
            </Button>

            <Button
              onClick={() => handleSendTest('alert')}
              disabled={sending || !phoneNumber}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              <span>Compliance Alert</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Recent SMS test results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, idx) => (
                <Alert
                  key={idx}
                  className={result.success
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                    : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                  }
                >
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className="ml-2">
                    <strong className="capitalize">{result.type}:</strong> {result.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <p className="font-medium text-gray-900 dark:text-white">
              Development Mode
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              If Twilio credentials are not configured, test messages will be logged to console instead of being sent.
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Configure these environment variables to enable SMS sending:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4">
              <li>• TWILIO_ACCOUNT_SID</li>
              <li>• TWILIO_AUTH_TOKEN</li>
              <li>• TWILIO_PHONE_NUMBER</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
