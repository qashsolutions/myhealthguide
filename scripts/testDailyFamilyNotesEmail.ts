/**
 * Test Daily Family Notes Email with PDF Attachment
 * Creates a test email with PDF attachment to verify the email template
 *
 * Usage: npx tsx scripts/testDailyFamilyNotesEmail.ts [recipientEmail]
 *
 * If no email is provided, it will use admin@myguide.health
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get recipient email from command line args or use default
const recipientEmail = process.argv[2] || 'admin@myguide.health';

// ============= DATA INTERFACE =============

interface DailyReportEmailData {
  elderName: string;
  date: string;
  medicationsTotal: number;
  medicationsTaken: number;
  medicationsMissed: number;
  supplementsTaken: number;
  mealsLogged: number;
  activeAlerts: number;
  summaryText: string;
}

// ============= PDF GENERATION =============

async function generateDailyReportPDF(data: DailyReportEmailData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 50,
        info: {
          Title: `Daily Care Update - ${data.elderName}`,
          Author: 'MyGuide Health',
          Subject: `Daily care report for ${data.elderName} - ${data.date}`
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Brand colors
      const brandBlue = '#2563eb';
      const successGreen = '#16a34a';
      const warningRed = '#dc2626';
      const textGray = '#374151';
      const lightGray = '#9ca3af';

      // Header with brand color bar
      doc.rect(0, 0, doc.page.width, 80).fill(brandBlue);

      // Title
      doc.fillColor('white')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('Daily Care Update', 50, 25, { align: 'center' });

      doc.fontSize(14)
         .font('Helvetica')
         .text(`${data.elderName} • ${data.date}`, 50, 55, { align: 'center' });

      // Reset position
      doc.fillColor(textGray);
      let yPos = 110;

      // Summary box
      doc.rect(50, yPos, doc.page.width - 100, 50)
         .fill('#f3f4f6');

      doc.fillColor(textGray)
         .fontSize(14)
         .font('Helvetica')
         .text(data.summaryText, 50, yPos + 18, {
           align: 'center',
           width: doc.page.width - 100
         });

      yPos += 70;

      // Alert section (if any)
      if (data.activeAlerts > 0) {
        doc.rect(50, yPos, doc.page.width - 100, 60)
           .fill('#fef2f2');

        doc.rect(50, yPos, 4, 60).fill(warningRed);

        doc.fillColor(warningRed)
           .fontSize(14)
           .font('Helvetica-Bold')
           .text(`⚠ ${data.activeAlerts} Active Alert${data.activeAlerts > 1 ? 's' : ''}`, 70, yPos + 15);

        doc.fillColor(textGray)
           .fontSize(12)
           .font('Helvetica')
           .text('Please check the app for details and recommended actions.', 70, yPos + 35);

        yPos += 80;
      }

      // Stats section
      doc.fillColor(textGray)
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('Today\'s Summary', 50, yPos);

      yPos += 35;

      // Medications card
      const cardWidth = (doc.page.width - 130) / 2;

      // Medications
      doc.rect(50, yPos, cardWidth, 100).fill('#f3f4f6');
      doc.fillColor(brandBlue)
         .fontSize(36)
         .font('Helvetica-Bold')
         .text(`${data.medicationsTaken}/${data.medicationsTotal}`, 50, yPos + 15, {
           width: cardWidth,
           align: 'center'
         });
      doc.fillColor(lightGray)
         .fontSize(10)
         .font('Helvetica')
         .text('MEDICATIONS', 50, yPos + 55, { width: cardWidth, align: 'center' });

      const medStatusColor = data.medicationsMissed > 0 ? warningRed : successGreen;
      const medStatusText = data.medicationsMissed === 0 ? '✓ All taken' : `⚠ ${data.medicationsMissed} missed`;
      doc.fillColor(medStatusColor)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(medStatusText, 50, yPos + 75, { width: cardWidth, align: 'center' });

      // Supplements
      doc.rect(80 + cardWidth, yPos, cardWidth, 100).fill('#f3f4f6');
      doc.fillColor(brandBlue)
         .fontSize(36)
         .font('Helvetica-Bold')
         .text(`${data.supplementsTaken}`, 80 + cardWidth, yPos + 15, {
           width: cardWidth,
           align: 'center'
         });
      doc.fillColor(lightGray)
         .fontSize(10)
         .font('Helvetica')
         .text('SUPPLEMENTS', 80 + cardWidth, yPos + 55, { width: cardWidth, align: 'center' });
      doc.fillColor(successGreen)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('Logged today', 80 + cardWidth, yPos + 75, { width: cardWidth, align: 'center' });

      yPos += 120;

      // Meals card (full width)
      doc.rect(50, yPos, doc.page.width - 100, 80).fill('#f3f4f6');
      doc.fillColor(brandBlue)
         .fontSize(36)
         .font('Helvetica-Bold')
         .text(`${data.mealsLogged}`, 50, yPos + 10, {
           width: doc.page.width - 100,
           align: 'center'
         });
      doc.fillColor(lightGray)
         .fontSize(10)
         .font('Helvetica')
         .text('MEALS LOGGED', 50, yPos + 50, { width: doc.page.width - 100, align: 'center' });

      yPos += 110;

      // Footer
      doc.fillColor(lightGray)
         .fontSize(10)
         .font('Helvetica')
         .text('Generated by MyGuide Health', 50, yPos, { align: 'center', width: doc.page.width - 100 });

      doc.text('For more details, log in at www.myguide.health', 50, yPos + 15, {
        align: 'center',
        width: doc.page.width - 100,
        link: 'https://www.myguide.health'
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ============= EMAIL HTML TEMPLATE =============

function generateDailyReportEmailHTML(data: DailyReportEmailData): string {
  const brandColor = '#2563eb';
  const successColor = '#16a34a';
  const warningColor = '#dc2626';
  const bgColor = '#f3f4f6';
  const cardBg = '#ffffff';
  const textColor = '#1f2937';
  const textMuted = '#6b7280';

  const medStatusColor = data.medicationsMissed > 0 ? warningColor : successColor;
  const medStatusText = data.medicationsMissed === 0
    ? '✓ All medications taken'
    : `⚠ ${data.medicationsMissed} missed`;

  let alertSection = '';
  if (data.activeAlerts > 0) {
    alertSection = `
      <tr>
        <td style="padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 8px; border-left: 4px solid ${warningColor};">
            <tr>
              <td style="padding: 16px;">
                <p style="margin: 0; color: ${warningColor}; font-weight: 600; font-size: 14px;">
                  ⚠️ ${data.activeAlerts} Active Alert${data.activeAlerts > 1 ? 's' : ''}
                </p>
                <p style="margin: 8px 0 0 0; color: ${textColor}; font-size: 14px;">
                  Please check the app for details and recommended actions.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Care Update - ${data.elderName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${bgColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor}; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: ${cardBg}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: ${brandColor}; padding: 24px; text-align: center;">
              <img src="https://www.myguide.health/favicon-32x32.png" alt="MyGuide Health" style="width: 32px; height: 32px; margin-bottom: 8px;">
              <h1 style="margin: 0; color: white; font-size: 20px; font-weight: 600;">Daily Care Update</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">${data.elderName} • ${data.date}</p>
            </td>
          </tr>

          <!-- Summary Banner -->
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor}; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px; text-align: center;">
                    <p style="margin: 0; color: ${textColor}; font-size: 16px; font-weight: 500;">${data.summaryText}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${alertSection}

          <!-- Stats Grid -->
          <tr>
            <td style="padding: 0 20px 20px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Medications Card -->
                  <td width="50%" style="padding: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor}; border-radius: 8px;">
                      <tr>
                        <td style="padding: 16px; text-align: center;">
                          <p style="margin: 0; font-size: 32px; font-weight: 700; color: ${brandColor};">${data.medicationsTaken}/${data.medicationsTotal}</p>
                          <p style="margin: 4px 0 0 0; font-size: 12px; color: ${textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">Medications</p>
                          <p style="margin: 8px 0 0 0; font-size: 12px; color: ${medStatusColor}; font-weight: 500;">${medStatusText}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Supplements Card -->
                  <td width="50%" style="padding: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor}; border-radius: 8px;">
                      <tr>
                        <td style="padding: 16px; text-align: center;">
                          <p style="margin: 0; font-size: 32px; font-weight: 700; color: ${brandColor};">${data.supplementsTaken}</p>
                          <p style="margin: 4px 0 0 0; font-size: 12px; color: ${textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">Supplements</p>
                          <p style="margin: 8px 0 0 0; font-size: 12px; color: ${successColor}; font-weight: 500;">Logged today</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <!-- Meals Card -->
                  <td colspan="2" style="padding: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor}; border-radius: 8px;">
                      <tr>
                        <td style="padding: 16px; text-align: center;">
                          <p style="margin: 0; font-size: 32px; font-weight: 700; color: ${brandColor};">${data.mealsLogged}</p>
                          <p style="margin: 4px 0 0 0; font-size: 12px; color: ${textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">Meals Logged</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Login Link -->
          <tr>
            <td style="padding: 0 20px 24px 20px; text-align: center;">
              <p style="margin: 0; color: ${textMuted}; font-size: 14px;">
                See the attached PDF for the full report.<br>
                <a href="https://www.myguide.health/dashboard/activity" style="color: ${brandColor}; text-decoration: none;">Log in to the app</a> to view more details or take action.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px; background-color: ${bgColor}; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: ${textMuted}; font-size: 12px;">
                You're receiving this because you're a member of ${data.elderName}'s care team on MyGuide Health.
              </p>
              <p style="margin: 8px 0 0 0; color: ${textMuted}; font-size: 12px;">
                <a href="https://www.myguide.health/dashboard/settings" style="color: ${brandColor}; text-decoration: none;">Manage notification preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============= DATE FORMATTING =============

function formatDateForEmail(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return date.toLocaleDateString('en-US', options);
}

function formatDateForFilename(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}${day}${year}`;
}

// ============= MAIN TEST FUNCTION =============

async function main() {
  // Initialize Firebase Admin
  const existingApps = getApps();
  let app;

  if (existingApps.length > 0) {
    app = existingApps[0];
  } else {
    const credPath = path.join(__dirname, 'serviceAccountKey.json');
    if (!fs.existsSync(credPath)) {
      console.error('Service account key not found at:', credPath);
      process.exit(1);
    }
    const credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    app = initializeApp({
      credential: cert(credentials),
      projectId: credentials.project_id,
    });
  }

  const db = getFirestore(app);

  console.log('=== Testing Daily Family Notes Email with PDF ===\n');
  console.log(`Recipient: ${recipientEmail}\n`);

  // Create test email data
  const now = new Date();
  const formattedDate = formatDateForEmail(now);

  const testData: DailyReportEmailData = {
    elderName: 'Mom',
    date: formattedDate,
    medicationsTotal: 5,
    medicationsTaken: 4,
    medicationsMissed: 1,
    supplementsTaken: 2,
    mealsLogged: 3,
    activeAlerts: 1,
    summaryText: '4/5 meds taken, 1 missed • 2 supplements • 3 meals logged'
  };

  console.log('Test Data:');
  console.log(`  Elder: ${testData.elderName}`);
  console.log(`  Date: ${testData.date}`);
  console.log(`  Medications: ${testData.medicationsTaken}/${testData.medicationsTotal} (${testData.medicationsMissed} missed)`);
  console.log(`  Supplements: ${testData.supplementsTaken}`);
  console.log(`  Meals: ${testData.mealsLogged}`);
  console.log(`  Active Alerts: ${testData.activeAlerts}`);
  console.log(`  Summary: ${testData.summaryText}\n`);

  // Generate PDF
  console.log('Generating PDF report...');
  const pdfBuffer = await generateDailyReportPDF(testData);
  console.log(`✅ PDF generated (${pdfBuffer.length} bytes)`);

  // Create filename
  const safeElderName = testData.elderName.replace(/[^a-zA-Z0-9]/g, '');
  const dateForFilename = formatDateForFilename(now);
  const pdfFilename = `${safeElderName}_${dateForFilename}.pdf`;
  console.log(`   Filename: ${pdfFilename}\n`);

  // Optionally save PDF locally for inspection
  const localPdfPath = path.join(__dirname, pdfFilename);
  fs.writeFileSync(localPdfPath, pdfBuffer);
  console.log(`📄 PDF saved locally: ${localPdfPath}\n`);

  // Create email document with PDF attachment
  console.log('Creating email document in "mail" collection...');

  const emailDoc = await db.collection('mail').add({
    to: recipientEmail,
    message: {
      subject: `Daily Care Update for ${testData.elderName} - ${formattedDate}`,
      html: generateDailyReportEmailHTML(testData),
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer.toString('base64'),
          encoding: 'base64',
          contentType: 'application/pdf'
        }
      ]
    },
    createdAt: Timestamp.now(),
    metadata: {
      type: 'daily_family_note_test',
      testRun: true
    }
  });

  console.log(`\n✅ Email document created: ${emailDoc.id}`);
  console.log(`Subject: Daily Care Update for ${testData.elderName} - ${formattedDate}`);
  console.log(`Attachment: ${pdfFilename}`);

  // Wait for extension to process
  console.log('\nWaiting 20 seconds for Trigger Email extension...');

  for (let i = 20; i > 0; i--) {
    process.stdout.write(`\r${i} seconds remaining...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\n');

  // Check delivery status
  const emailDocSnap = await emailDoc.get();
  const emailData = emailDocSnap.data();

  if (emailData?.delivery) {
    console.log('=== Delivery Status ===');
    console.log('State:', emailData.delivery.state);

    if (emailData.delivery.state === 'SUCCESS') {
      console.log('✅ EMAIL WITH PDF SENT SUCCESSFULLY!');
      console.log('Attempts:', emailData.delivery.attempts);
      if (emailData.delivery.info?.messageId) {
        console.log('Message ID:', emailData.delivery.info.messageId);
      }
    } else if (emailData.delivery.state === 'ERROR') {
      console.log('❌ EMAIL FAILED');
      console.log('Error:', emailData.delivery.error);
    } else {
      console.log('⏳ Status:', emailData.delivery.state);
    }
  } else {
    console.log('⚠️  No delivery status yet - extension may still be processing');
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
