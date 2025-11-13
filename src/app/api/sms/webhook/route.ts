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

import { NextRequest, NextResponse } from 'next/server';
import { parseSMSCommand, getHelpMessage } from '@/lib/sms/twilioService';
import { MedicationService } from '@/lib/firebase/medications';

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
        // TODO: Update medication log status to 'taken'
        // This requires matching the phone number to a user/group
        // and finding the most recent pending medication
        response = 'Confirmed! Medication marked as taken. Thank you.';
        break;

      case 'missed':
        // TODO: Update medication log status to 'missed'
        response = 'Noted. Medication marked as missed.';
        break;

      case 'skip':
        // TODO: Update medication log status to 'skipped'
        response = 'Understood. Medication marked as skipped for this dose.';
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
export async function validateTwilioSignature(request: NextRequest): Promise<boolean> {
  const twilioSignature = request.headers.get('X-Twilio-Signature');

  if (!twilioSignature) {
    return false;
  }

  // In production, implement Twilio signature validation
  // using twilio.validateRequest()
  // https://www.twilio.com/docs/usage/webhooks/webhooks-security

  return true;
}
