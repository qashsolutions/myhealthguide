// ============================================
// DISABLED: Using Firebase Auth instead of Twilio for SMS
// This webhook handler is for Twilio SMS responses
// Keep for reference but do not use in production
// ============================================

/**
 * Twilio SMS Webhook Handler
 * Phase 5: SMS Notifications
 *
 * Handles incoming SMS messages from Twilio
 * Users can reply to notifications with commands:
 * - TAKEN / DONE / YES / CONFIRMED
 * - MISSED / NO / FORGOT
 * - SKIP / SKIPPED / CANCEL
 * - HELP / INFO / ?
 */

/* DISABLED: Using Firebase Auth instead
import { NextRequest, NextResponse } from 'next/server';
import { parseSMSCommand, getHelpMessage } from '@/lib/sms/twilioService';
import { MedicationService } from '@/lib/firebase/medications';
import { doc, updateDoc, query, collection, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { hashPhoneNumber } from '@/lib/utils/phoneUtils';

// Helper function to find user by phone number and get recent medication log
async function findRecentMedicationLog(phoneNumber: string) {
  try {
    // Hash the phone number to match against stored hashes
    const phoneHash = hashPhoneNumber(phoneNumber);

    // Find user by phone number hash
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('phoneNumberHash', '==', phoneHash));
    const userSnapshot = await getDocs(userQuery);

    if (userSnapshot.empty) {
      return null;
    }

    const user = userSnapshot.docs[0].data();
    const groupId = user.groups?.[0]?.groupId;

    if (!groupId) {
      return null;
    }

    // Find most recent medication log from today that's pending
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logsRef = collection(db, 'medication_logs');
    const logsQuery = query(
      logsRef,
      where('groupId', '==', groupId),
      where('scheduledTime', '>=', Timestamp.fromDate(today)),
      orderBy('scheduledTime', 'desc'),
      limit(1)
    );

    const logsSnapshot = await getDocs(logsQuery);

    if (logsSnapshot.empty) {
      return null;
    }

    return {
      logId: logsSnapshot.docs[0].id,
      logData: logsSnapshot.docs[0].data()
    };
  } catch (error) {
    console.error('Error finding medication log:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse Twilio webhook data
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;

    console.log('Incoming SMS:', { from, body, messageSid });

    // Parse the command
    const { command } = parseSMSCommand(body);

    // Generate response based on command
    let response = '';

    switch (command) {
      case 'taken':
        try {
          const result = await findRecentMedicationLog(from);

          if (result) {
            await updateDoc(doc(db, 'medication_logs', result.logId), {
              status: 'taken',
              actualTime: Timestamp.now(),
              notes: 'Confirmed via SMS'
            });
            response = 'Confirmed! Medication marked as taken. Thank you.';
          } else {
            response = 'No pending medication found. Visit myguide.health to log manually.';
          }
        } catch (error) {
          console.error('Error updating taken status:', error);
          response = 'Error updating status. Please try again or visit myguide.health.';
        }
        break;

      case 'missed':
        try {
          const result = await findRecentMedicationLog(from);

          if (result) {
            await updateDoc(doc(db, 'medication_logs', result.logId), {
              status: 'missed',
              actualTime: Timestamp.now()
            });
            response = 'Noted. Medication marked as missed.';
          } else {
            response = 'No pending medication found. Visit myguide.health for more info.';
          }
        } catch (error) {
          console.error('Error updating missed status:', error);
          response = 'Error updating status. Please try again or visit myguide.health.';
        }
        break;

      case 'skip':
        try {
          const result = await findRecentMedicationLog(from);

          if (result) {
            await updateDoc(doc(db, 'medication_logs', result.logId), {
              status: 'skipped',
              actualTime: Timestamp.now()
            });
            response = 'Understood. Medication marked as skipped for this dose.';
          } else {
            response = 'No pending medication found. Visit myguide.health for more info.';
          }
        } catch (error) {
          console.error('Error updating skipped status:', error);
          response = 'Error updating status. Please try again or visit myguide.health.';
        }
        break;

      case 'help':
        response = getHelpMessage();
        break;

      case 'unknown':
        response = 'Command not recognized. Reply HELP for available commands.';
        break;
    }

    // Respond with TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${response}</Message>
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    });

  } catch (error) {
    console.error('Error handling SMS webhook:', error);

    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, there was an error processing your message. Please try again or visit myguide.health.</Message>
</Response>`;

    return new NextResponse(errorTwiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    });
  }
}

// Verify that the request is from Twilio (optional but recommended)
async function validateTwilioSignature(request: NextRequest): Promise<boolean> {
  const twilioSignature = request.headers.get('X-Twilio-Signature');

  if (!twilioSignature) {
    return false;
  }

  // In production, implement Twilio signature validation
  // using twilio.validateRequest()
  // https://www.twilio.com/docs/usage/webhooks/webhooks-security

  return true;
}
*/ // END DISABLED Twilio webhook code
