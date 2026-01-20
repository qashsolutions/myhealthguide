/**
 * Test Daily Family Notes Email with PDF Attachment
 * Enhanced with Diet Details and Caregiver Notes
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

// ============= DATA INTERFACES =============

interface DietDetail {
  meal: string;
  items: string[];
  estimatedCalories?: number;
  nutritionScore?: number;
  concerns?: string[];
  notes?: string;
}

interface CaregiverNote {
  source: string;
  context: string;
  note: string;
  timestamp?: Date;
  isConcern?: boolean;
}

interface FlaggedConcern {
  type: 'symptom' | 'diet' | 'medication';
  severity: 'amber' | 'red';
  context: string;
  message: string;
}

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
  alertMessages?: string[];
  dietDetails?: DietDetail[];
  caregiverNotes?: CaregiverNote[];
  totalCalories?: number;
  flaggedConcerns?: FlaggedConcern[];
}

// ============= PDF GENERATION =============

/**
 * Generate PDF report for daily family notes
 * Layout Order:
 * 1. Header
 * 2. Today's Summary cards (Medications, Supplements)
 * 3. Concerns to Note (if any)
 * 4. Meals Table (Breakfast, Lunch, Dinner with Score and Food Items)
 * 5. Caregiver Notes & Observations
 * 6. Footer
 */
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
      const amberColor = '#d97706';

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
      let yPos = 100;

      // ============= TODAY'S SUMMARY CARDS (AT TOP) =============
      doc.fillColor(textGray)
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('Today\'s Summary', 50, yPos);

      yPos += 30;

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
      const medStatusText = data.medicationsMissed === 0 ? 'All taken' : `${data.medicationsMissed} missed`;
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

      yPos += 115;

      // ============= CONCERNS SECTION =============
      if (data.flaggedConcerns && data.flaggedConcerns.length > 0) {
        // Determine if there are any red (urgent) concerns
        const hasRedConcerns = data.flaggedConcerns.some(c => c.severity === 'red');
        const headerColor = hasRedConcerns ? warningRed : amberColor;
        const headerBgColor = hasRedConcerns ? '#fef2f2' : '#fffbeb';

        // Concerns header
        doc.rect(50, yPos, doc.page.width - 100, 30)
           .fill(headerBgColor);
        doc.rect(50, yPos, doc.page.width - 100, 30)
           .stroke(headerColor);

        doc.fillColor(headerColor)
           .fontSize(14)
           .font('Helvetica-Bold')
           .text(`[!] Concerns to Note (${data.flaggedConcerns.length})`, 60, yPos + 8);

        yPos += 35;

        // Each concern
        for (const concern of data.flaggedConcerns) {
          // Check if we need a new page
          if (yPos > doc.page.height - 100) {
            doc.addPage();
            yPos = 50;
          }

          const isRed = concern.severity === 'red';
          const concernColor = isRed ? warningRed : amberColor;
          const concernBgColor = isRed ? '#fef2f2' : '#fffbeb';
          const icon = concern.type === 'medication' ? '[Rx]' :
                       concern.type === 'diet' ? '[Diet]' : '[!]';

          // Concern box
          const concernHeight = 45;
          doc.rect(50, yPos, doc.page.width - 100, concernHeight)
             .fill(concernBgColor);
          doc.rect(50, yPos, 4, concernHeight).fill(concernColor);

          // Context
          doc.fillColor(concernColor)
             .fontSize(11)
             .font('Helvetica-Bold')
             .text(`${icon} ${concern.context}`, 60, yPos + 8);

          // Message
          doc.fillColor(textGray)
             .fontSize(10)
             .font('Helvetica')
             .text(concern.message, 60, yPos + 22, {
               width: doc.page.width - 130
             });

          yPos += concernHeight + 5;
        }

        yPos += 15;
      }

      // ============= MEALS TABLE SECTION =============
      if (data.dietDetails && data.dietDetails.length > 0) {
        // Check if we need a new page
        if (yPos > doc.page.height - 200) {
          doc.addPage();
          yPos = 50;
        }

        doc.fillColor(textGray)
           .fontSize(18)
           .font('Helvetica-Bold')
           .text('Meals & Nutrition', 50, yPos);

        // Total calories if available
        if (data.totalCalories) {
          doc.fillColor(brandBlue)
             .fontSize(12)
             .font('Helvetica')
             .text(`Total: ~${data.totalCalories} calories`, 350, yPos + 3);
        }

        yPos += 30;

        // Table header
        const tableLeft = 50;
        const tableWidth = doc.page.width - 100;
        const colMeal = 100;      // Meal column width
        const colScore = 60;      // Score column width
        const colFood = tableWidth - colMeal - colScore;  // Food items column

        // Header row background
        doc.rect(tableLeft, yPos, tableWidth, 25).fill('#e5e7eb');

        // Header text
        doc.fillColor(textGray)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text('Meal', tableLeft + 10, yPos + 7)
           .text('Score', tableLeft + colMeal + 10, yPos + 7)
           .text('Food Items', tableLeft + colMeal + colScore + 10, yPos + 7);

        yPos += 25;

        // Table rows
        for (let i = 0; i < data.dietDetails.length; i++) {
          const meal = data.dietDetails[i];

          // Check if we need a new page
          if (yPos > doc.page.height - 80) {
            doc.addPage();
            yPos = 50;
          }

          // Calculate row height based on food items text
          const foodText = meal.items && meal.items.length > 0 ? meal.items.join(', ') : '-';
          const foodTextHeight = Math.max(20, Math.ceil(foodText.length / 45) * 14 + 10);
          const rowHeight = Math.max(35, foodTextHeight);

          // Alternating row background
          if (i % 2 === 0) {
            doc.rect(tableLeft, yPos, tableWidth, rowHeight).fill('#f9fafb');
          } else {
            doc.rect(tableLeft, yPos, tableWidth, rowHeight).fill('white');
          }

          // Draw row borders
          doc.rect(tableLeft, yPos, tableWidth, rowHeight).stroke('#e5e7eb');

          // Meal name with calories
          const mealName = meal.meal || 'Meal';
          doc.fillColor(textGray)
             .fontSize(11)
             .font('Helvetica-Bold')
             .text(mealName, tableLeft + 10, yPos + 8, { width: colMeal - 15 });

          if (meal.estimatedCalories) {
            doc.fillColor(lightGray)
               .fontSize(9)
               .font('Helvetica')
               .text(`${meal.estimatedCalories} cal`, tableLeft + 10, yPos + 22);
          }

          // Score
          const scoreText = meal.nutritionScore !== undefined ? `${meal.nutritionScore}/100` : '-';
          const scoreColor = meal.nutritionScore !== undefined
            ? (meal.nutritionScore >= 70 ? successGreen : (meal.nutritionScore >= 40 ? amberColor : warningRed))
            : lightGray;
          doc.fillColor(scoreColor)
             .fontSize(11)
             .font('Helvetica-Bold')
             .text(scoreText, tableLeft + colMeal + 10, yPos + 12);

          // Food items
          doc.fillColor(textGray)
             .fontSize(10)
             .font('Helvetica')
             .text(foodText, tableLeft + colMeal + colScore + 10, yPos + 8, {
               width: colFood - 20,
               lineGap: 2
             });

          yPos += rowHeight;

          // Concerns row if any
          if (meal.concerns && meal.concerns.length > 0) {
            const concernRowHeight = 25;
            doc.rect(tableLeft, yPos, tableWidth, concernRowHeight).fill('#fef2f2');
            doc.fillColor(warningRed)
               .fontSize(9)
               .font('Helvetica')
               .text('* ' + meal.concerns.join('; '), tableLeft + 10, yPos + 7, {
                 width: tableWidth - 20
               });
            yPos += concernRowHeight;
          }
        }

        yPos += 20;
      } else {
        // No diet details - show simple count
        doc.fillColor(textGray)
           .fontSize(18)
           .font('Helvetica-Bold')
           .text('Meals & Nutrition', 50, yPos);

        yPos += 30;

        doc.rect(50, yPos, doc.page.width - 100, 60).fill('#f3f4f6');
        doc.fillColor(brandBlue)
           .fontSize(28)
           .font('Helvetica-Bold')
           .text(`${data.mealsLogged} meals logged`, 50, yPos + 18, {
             width: doc.page.width - 100,
             align: 'center'
           });
        yPos += 80;
      }

      // ============= CAREGIVER NOTES SECTION =============
      if (data.caregiverNotes && data.caregiverNotes.length > 0) {
        // Check if we need a new page
        if (yPos > doc.page.height - 150) {
          doc.addPage();
          yPos = 50;
        }

        doc.fillColor(textGray)
           .fontSize(18)
           .font('Helvetica-Bold')
           .text('Caregiver Notes & Observations', 50, yPos);

        yPos += 30;

        for (const note of data.caregiverNotes) {
          // Check if we need a new page
          if (yPos > doc.page.height - 100) {
            doc.addPage();
            yPos = 50;
          }

          // Source icon and context
          const sourceIcon = note.source === 'medication' ? '[Rx]' :
                            note.source === 'diet' ? '[Diet]' : '[Rx]';

          doc.fillColor(brandBlue)
             .fontSize(11)
             .font('Helvetica-Bold')
             .text(`${sourceIcon} ${note.context}`, 50, yPos);

          yPos += 16;

          // Note content
          doc.fillColor(textGray)
             .fontSize(11)
             .font('Helvetica')
             .text(`"${note.note}"`, 60, yPos, {
               width: doc.page.width - 120,
               indent: 10
             });

          // Calculate text height dynamically
          const noteHeight = Math.ceil(note.note.length / 65) * 14;
          yPos += noteHeight + 15;
        }

        yPos += 10;
      }

      // Footer
      // Check if we need a new page for footer
      if (yPos > doc.page.height - 60) {
        doc.addPage();
        yPos = doc.page.height - 80;
      }

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

  // Build concerns section - prominently displayed at top
  const amberColor = '#d97706'; // Amber-600
  let concernsSection = '';
  if (data.flaggedConcerns && data.flaggedConcerns.length > 0) {
    const concernsHtml = data.flaggedConcerns.map(concern => {
      const isRed = concern.severity === 'red';
      const bgColorForConcern = isRed ? '#fef2f2' : '#fffbeb';
      const borderColorForConcern = isRed ? warningColor : amberColor;
      const textColorForConcern = isRed ? warningColor : amberColor;
      const icon = concern.type === 'medication' ? '💊' :
                   concern.type === 'diet' ? '🍽️' : '⚠️';

      return `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColorForConcern}; border-radius: 6px; border-left: 3px solid ${borderColorForConcern};">
              <tr>
                <td style="padding: 10px 12px;">
                  <p style="margin: 0; font-weight: 600; color: ${textColorForConcern}; font-size: 12px;">${icon} ${concern.context}</p>
                  <p style="margin: 4px 0 0 0; color: ${textColor}; font-size: 13px;">${concern.message}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    }).join('');

    // Determine header color based on severity of concerns
    const hasRedConcerns = data.flaggedConcerns.some(c => c.severity === 'red');
    const headerBgColor = hasRedConcerns ? '#fef2f2' : '#fffbeb';
    const headerBorderColor = hasRedConcerns ? warningColor : amberColor;
    const headerTextColor = hasRedConcerns ? warningColor : amberColor;

    concernsSection = `
      <tr>
        <td style="padding: 0 20px 20px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${headerBgColor}; border-radius: 8px; border: 2px solid ${headerBorderColor};">
            <tr>
              <td style="padding: 16px;">
                <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: ${headerTextColor};">
                  ⚠️ Concerns to Note (${data.flaggedConcerns.length})
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${concernsHtml}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }

  // Build diet details section
  let dietSection = '';
  if (data.dietDetails && data.dietDetails.length > 0) {
    const mealsHtml = data.dietDetails.map(meal => {
      const calorieText = meal.estimatedCalories ? ` (~${meal.estimatedCalories} cal)` : '';
      const scoreText = meal.nutritionScore !== undefined ? ` • Score: ${meal.nutritionScore}/100` : '';
      const concernsHtml = meal.concerns && meal.concerns.length > 0
        ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: ${warningColor};">⚠ ${meal.concerns.join('; ')}</p>`
        : '';
      return `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0; font-weight: 600; color: ${textColor}; font-size: 14px;">${meal.meal}${calorieText}${scoreText}</p>
            <p style="margin: 4px 0 0 0; color: ${textMuted}; font-size: 13px;">${meal.items.join(', ')}</p>
            ${concernsHtml}
          </td>
        </tr>`;
    }).join('');

    const totalCalText = data.totalCalories ? `<span style="color: ${brandColor}; font-weight: 500;">~${data.totalCalories} cal total</span>` : '';

    dietSection = `
      <tr>
        <td style="padding: 0 20px 20px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor}; border-radius: 8px;">
            <tr>
              <td style="padding: 16px;">
                <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: ${textColor};">
                  🍽️ Meals & Nutrition ${totalCalText}
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${mealsHtml}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  } else {
    // Simple meals count if no detailed data
    dietSection = `
      <tr>
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
      </tr>`;
  }

  // Build caregiver notes section
  let notesSection = '';
  if (data.caregiverNotes && data.caregiverNotes.length > 0) {
    const notesHtml = data.caregiverNotes.map(note => {
      const sourceIcon = note.source === 'medication' ? '💊' :
                        note.source === 'diet' ? '🍽️' : '💊';
      return `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0; font-weight: 600; color: ${brandColor}; font-size: 13px;">${sourceIcon} ${note.context}</p>
            <p style="margin: 4px 0 0 0; color: ${textColor}; font-size: 13px; font-style: italic;">"${note.note}"</p>
          </td>
        </tr>`;
    }).join('');

    notesSection = `
      <tr>
        <td style="padding: 0 20px 20px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor}; border-radius: 8px;">
            <tr>
              <td style="padding: 16px;">
                <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: ${textColor};">
                  📝 Caregiver Notes & Observations
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${notesHtml}
                </table>
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

          <!-- Concerns Section - Prominently displayed -->
          ${concernsSection}

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
              </table>
            </td>
          </tr>

          <!-- Diet Details Section -->
          ${dietSection}

          <!-- Caregiver Notes Section -->
          ${notesSection}

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

  console.log('=== Testing Daily Family Notes Email with Enhanced PDF ===\n');
  console.log(`Recipient: ${recipientEmail}\n`);

  // Create test email data with diet details and caregiver notes
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
    summaryText: '4/5 meds taken, 1 missed • 2 supplements • 3 meals logged',
    // Enhanced data
    dietDetails: [
      {
        meal: 'Breakfast',
        items: ['Oatmeal with honey', 'Banana', 'Green tea'],
        estimatedCalories: 350,
        nutritionScore: 82,
        concerns: []
      },
      {
        meal: 'Lunch',
        items: ['Grilled chicken salad', 'Whole wheat bread', 'Orange juice'],
        estimatedCalories: 520,
        nutritionScore: 78,
        concerns: ['Sodium content slightly elevated']
      },
      {
        meal: 'Dinner',
        items: ['Steamed fish', 'Brown rice', 'Steamed vegetables', 'Water'],
        estimatedCalories: 480,
        nutritionScore: 85,
        concerns: []
      }
    ],
    caregiverNotes: [
      {
        source: 'medication',
        context: 'Metformin - 8:00 AM',
        note: 'Mom seemed a bit confused this morning, took a few minutes to recognize the medication. This is the second time this week.',
        timestamp: new Date()
      },
      {
        source: 'medication',
        context: 'Blood Pressure Med - 12:00 PM',
        note: 'She complained of mild dizziness after taking this. Sat down for 10 minutes and felt better.',
        timestamp: new Date()
      },
      {
        source: 'diet',
        context: 'Lunch',
        note: 'Mom had a good appetite today. She finished everything on her plate which is unusual lately.',
        timestamp: new Date()
      }
    ],
    totalCalories: 1350,
    // Flagged concerns for prominent display
    flaggedConcerns: [
      {
        type: 'symptom',
        severity: 'amber',
        context: 'Metformin - 8:00 AM',
        message: 'Mom seemed a bit confused this morning, took a few minutes to recognize the medication. This is the second time this week.'
      },
      {
        type: 'symptom',
        severity: 'amber',
        context: 'Blood Pressure Med - 12:00 PM',
        message: 'She complained of mild dizziness after taking this. Sat down for 10 minutes and felt better.'
      },
      {
        type: 'diet',
        severity: 'amber',
        context: 'Lunch',
        message: 'Sodium content slightly elevated'
      },
      {
        type: 'medication',
        severity: 'amber',
        context: 'Medications',
        message: '1 medication missed today'
      }
    ]
  };

  console.log('Test Data:');
  console.log(`  Elder: ${testData.elderName}`);
  console.log(`  Date: ${testData.date}`);
  console.log(`  Medications: ${testData.medicationsTaken}/${testData.medicationsTotal} (${testData.medicationsMissed} missed)`);
  console.log(`  Supplements: ${testData.supplementsTaken}`);
  console.log(`  Meals: ${testData.mealsLogged}`);
  console.log(`  Active Alerts: ${testData.activeAlerts}`);
  console.log(`  Total Calories: ${testData.totalCalories}`);
  console.log(`  Caregiver Notes: ${testData.caregiverNotes?.length || 0}`);
  console.log(`  Flagged Concerns: ${testData.flaggedConcerns?.length || 0}`);
  console.log(`  Summary: ${testData.summaryText}\n`);

  // Generate PDF
  console.log('Generating PDF report with diet details and caregiver notes...');
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
      console.log('✅ EMAIL WITH ENHANCED PDF SENT SUCCESSFULLY!');
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
