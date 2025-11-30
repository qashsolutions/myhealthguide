/**
 * PDF Export Utility
 * Generates health data reports in PDF format
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { MedicationLog, DietEntry } from '@/types';

interface ExportData {
  elderName: string;
  startDate: Date;
  endDate: Date;
  medicationLogs: MedicationLog[];
  dietEntries: DietEntry[];
  medications: Array<{
    id: string;
    name: string;
    dosage: string;
  }>;
}

interface ComplianceMetrics {
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  complianceRate: number;
  dietEntriesCount: number;
}

/**
 * Generate PDF health report
 */
export async function generateHealthReportPDF(data: ExportData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Health Data Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(data.elderName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;

  doc.setFontSize(10);
  doc.setTextColor(100);
  const dateRange = `${format(data.startDate, 'MMM dd, yyyy')} - ${format(data.endDate, 'MMM dd, yyyy')}`;
  doc.text(dateRange, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Calculate metrics
  const metrics = calculateMetrics(data);

  // Summary Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Summary', 15, yPosition);
  yPosition += 8;

  // Summary boxes
  const boxWidth = (pageWidth - 40) / 3;
  const boxHeight = 25;
  const boxY = yPosition;

  // Medication Compliance Box
  doc.setFillColor(59, 130, 246); // Blue
  doc.roundedRect(15, boxY, boxWidth, boxHeight, 3, 3, 'F');
  doc.setTextColor(255);
  doc.setFontSize(10);
  doc.text('Medication Compliance', 15 + boxWidth / 2, boxY + 8, { align: 'center' });
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${metrics.complianceRate.toFixed(1)}%`, 15 + boxWidth / 2, boxY + 18, { align: 'center' });

  // Doses Taken Box
  doc.setFillColor(34, 197, 94); // Green
  doc.roundedRect(20 + boxWidth, boxY, boxWidth, boxHeight, 3, 3, 'F');
  doc.setFontSize(10);
  doc.text('Doses Taken', 20 + boxWidth + boxWidth / 2, boxY + 8, { align: 'center' });
  doc.setFontSize(18);
  doc.text(`${metrics.takenDoses}`, 20 + boxWidth + boxWidth / 2, boxY + 18, { align: 'center' });

  // Missed Doses Box
  const missedColor = metrics.missedDoses > 5 ? [239, 68, 68] : [251, 146, 60]; // Red or Orange
  doc.setFillColor(missedColor[0], missedColor[1], missedColor[2]);
  doc.roundedRect(25 + boxWidth * 2, boxY, boxWidth, boxHeight, 3, 3, 'F');
  doc.setFontSize(10);
  doc.text('Missed Doses', 25 + boxWidth * 2 + boxWidth / 2, boxY + 8, { align: 'center' });
  doc.setFontSize(18);
  doc.text(`${metrics.missedDoses}`, 25 + boxWidth * 2 + boxWidth / 2, boxY + 18, { align: 'center' });

  yPosition = boxY + boxHeight + 15;

  // Medication Details Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Medication Details', 15, yPosition);
  yPosition += 5;

  const medicationTableData = data.medications.map(med => {
    const medLogs = data.medicationLogs.filter(log => log.medicationId === med.id);
    const taken = medLogs.filter(log => log.status === 'taken').length;
    const missed = medLogs.filter(log => log.status === 'missed').length;
    const total = medLogs.length;
    const compliance = total > 0 ? ((taken / total) * 100).toFixed(1) : '0.0';

    return [
      med.name,
      med.dosage,
      total.toString(),
      taken.toString(),
      missed.toString(),
      `${compliance}%`
    ];
  });

  autoTable(doc, {
    startY: yPosition,
    head: [['Medication', 'Dosage', 'Total', 'Taken', 'Missed', 'Compliance']],
    body: medicationTableData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
    styles: { fontSize: 9 },
    columnStyles: {
      5: { fontStyle: 'bold' }
    }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Check if we need a new page
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 20;
  }

  // Missed Doses Details (if any)
  if (metrics.missedDoses > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Missed Doses Log', 15, yPosition);
    yPosition += 5;

    const missedLogsData = data.medicationLogs
      .filter(log => log.status === 'missed')
      .slice(0, 20) // Limit to first 20
      .map(log => {
        const med = data.medications.find(m => m.id === log.medicationId);
        const scheduledDate = log.scheduledTime instanceof Date
          ? log.scheduledTime
          : new Date(log.scheduledTime);

        return [
          format(scheduledDate, 'MMM dd, yyyy'),
          format(scheduledDate, 'h:mm a'),
          med?.name || 'Unknown',
          log.notes || '-'
        ];
      });

    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Time', 'Medication', 'Notes']],
      body: missedLogsData,
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255] },
      styles: { fontSize: 8 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Check if we need a new page
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 20;
  }

  // Diet Summary
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Diet Summary', 15, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Meals Logged: ${metrics.dietEntriesCount}`, 15, yPosition);
  yPosition += 6;

  const avgMealsPerDay = (metrics.dietEntriesCount / Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24))).toFixed(1);
  doc.text(`Average Meals Per Day: ${avgMealsPerDay}`, 15, yPosition);
  yPosition += 10;

  // Recent Diet Entries
  if (data.dietEntries.length > 0) {
    const recentDietData = data.dietEntries
      .slice(0, 15)
      .map(entry => {
        const entryDate = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
        return [
          format(entryDate, 'MMM dd, yyyy'),
          entry.meal.charAt(0).toUpperCase() + entry.meal.slice(1),
          entry.items?.join(', ') || entry.notes || '-',
          entry.method === 'voice' ? '🎤 Voice' : '⌨️ Manual'
        ];
      });

    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Meal Type', 'Items', 'Method']],
      body: recentDietData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] },
      styles: { fontSize: 8 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Footer with disclaimer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated on ${format(new Date(), 'MMM dd, yyyy h:mm a')} | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 12,
      { align: 'center' }
    );
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(
      'DISCLAIMER: This report contains data analysis only and does NOT provide medical advice, recommendations,',
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
    doc.text(
      'or guidance. All medical decisions should be made in consultation with qualified healthcare providers.',
      pageWidth / 2,
      pageHeight - 4,
      { align: 'center' }
    );
  }

  // Save PDF
  const fileName = `Health_Report_${data.elderName.replace(/\s+/g, '_')}_${format(data.startDate, 'yyyy-MM-dd')}_to_${format(data.endDate, 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

/**
 * Calculate compliance metrics
 */
function calculateMetrics(data: ExportData): ComplianceMetrics {
  const totalDoses = data.medicationLogs.length;
  const takenDoses = data.medicationLogs.filter(log => log.status === 'taken').length;
  const missedDoses = data.medicationLogs.filter(log => log.status === 'missed').length;
  const complianceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

  return {
    totalDoses,
    takenDoses,
    missedDoses,
    complianceRate,
    dietEntriesCount: data.dietEntries.length
  };
}

// ============= Clinical Note PDF Export =============

export interface DiscussionPoint {
  topic: string;
  observation: string;
  discussionPrompt: string;
}

export interface ProviderQuestion {
  context: string;
  question: string;
}

export interface ClinicalNotePDFData {
  patientInfo: {
    name: string;
    age: number;
    dateOfBirth?: string;
    medicalConditions?: string[];
    allergies?: string[];
  };
  reportInfo: {
    generatedDate: string;
    timeframeDays: number;
    generatedBy: string;
  };
  clinicalSummary: string;
  medicationList: Array<{
    name: string;
    dosage: string;
    frequency: string;
    compliance?: string;
  }>;
  complianceAnalysis: {
    overallRate: string;
    totalDoses: number;
    takenDoses: number;
    missedDoses: number;
  };
  // Discussion points - conversation starters for provider visits (NOT recommendations)
  discussionPoints: DiscussionPoint[];
  // Questions for provider - open-ended questions based on data patterns
  questionsForProvider: ProviderQuestion[];
}

/**
 * Generate a professional clinical note PDF for doctor visits
 */
export async function generateClinicalNotePDF(
  data: ClinicalNotePDFData,
  filename?: string
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Helper function to add text with word wrap
  const addWrappedText = (text: string, maxWidth: number, fontSize: number = 10) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);

    lines.forEach((line: string) => {
      // Check if we need a new page
      if (yPosition > pageHeight - margin - 30) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += fontSize * 0.5;
    });
  };

  // === HEADER ===
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Clinical Summary Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Date and timeframe
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${data.reportInfo.generatedDate}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text(`Period: Last ${data.reportInfo.timeframeDays} days`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // === PATIENT INFORMATION ===
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient Information', margin, yPosition);
  yPosition += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${data.patientInfo.name}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Age: ${data.patientInfo.age} years`, margin, yPosition);
  yPosition += 5;

  if (data.patientInfo.dateOfBirth) {
    doc.text(`Date of Birth: ${data.patientInfo.dateOfBirth}`, margin, yPosition);
    yPosition += 5;
  }

  if (data.patientInfo.medicalConditions && data.patientInfo.medicalConditions.length > 0) {
    const conditions = data.patientInfo.medicalConditions.join(', ');
    const conditionsLines = doc.splitTextToSize(`Known Conditions: ${conditions}`, pageWidth - 2 * margin);
    conditionsLines.forEach((line: string) => {
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });
  }

  if (data.patientInfo.allergies && data.patientInfo.allergies.length > 0) {
    doc.setTextColor(200, 0, 0); // Red for allergies
    const allergies = data.patientInfo.allergies.join(', ');
    const allergiesLines = doc.splitTextToSize(`ALLERGIES: ${allergies}`, pageWidth - 2 * margin);
    allergiesLines.forEach((line: string) => {
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });
    doc.setTextColor(0, 0, 0); // Reset to black
  }

  yPosition += 5;

  // === CLINICAL SUMMARY ===
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Clinical Summary', margin, yPosition);
  yPosition += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  addWrappedText(data.clinicalSummary, pageWidth - 2 * margin);
  yPosition += 8;

  // === MEDICATION ADHERENCE ===
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Medication Adherence', margin, yPosition);
  yPosition += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Overall Compliance: ${data.complianceAnalysis.overallRate}%`, margin, yPosition);
  yPosition += 5;
  doc.text(`Doses Taken: ${data.complianceAnalysis.takenDoses} of ${data.complianceAnalysis.totalDoses}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Doses Missed: ${data.complianceAnalysis.missedDoses}`, margin, yPosition);
  yPosition += 8;

  // === CURRENT MEDICATIONS TABLE ===
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Current Medications', margin, yPosition);
  yPosition += 7;

  // Check if we need a new page before the table
  if (yPosition > pageHeight - 80) {
    doc.addPage();
    yPosition = margin;
  }

  // Create medication table
  const medicationTableData = data.medicationList.map(med => [
    med.name,
    med.dosage,
    med.frequency,
    med.compliance || 'N/A'
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Medication', 'Dosage', 'Frequency', 'Compliance']],
    body: medicationTableData,
    theme: 'striped',
    headStyles: { fillColor: [66, 139, 202] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 9 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // === DISCUSSION POINTS ===
  if (data.discussionPoints && data.discussionPoints.length > 0) {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Discussion Points for Your Visit', margin, yPosition);
    yPosition += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Conversation starters based on data patterns - not medical advice or recommendations', margin, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    data.discussionPoints.forEach((point, index) => {
      if (yPosition > pageHeight - margin - 45) {
        doc.addPage();
        yPosition = margin;
      }

      // Topic header
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${point.topic}`, margin, yPosition);
      yPosition += 5;

      // Observation
      doc.setFont('helvetica', 'normal');
      const obsLines = doc.splitTextToSize(`Data shows: ${point.observation}`, pageWidth - 2 * margin - 5);
      doc.text(obsLines, margin + 5, yPosition);
      yPosition += obsLines.length * 4 + 2;

      // Discussion prompt
      doc.setFont('helvetica', 'italic');
      const promptLines = doc.splitTextToSize(point.discussionPrompt, pageWidth - 2 * margin - 5);
      doc.text(promptLines, margin + 5, yPosition);
      doc.setFont('helvetica', 'normal');
      yPosition += promptLines.length * 4 + 5;
    });

    yPosition += 5;
  }

  // === QUESTIONS FOR PROVIDER ===
  if (data.questionsForProvider && data.questionsForProvider.length > 0) {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Questions for Your Healthcare Provider', margin, yPosition);
    yPosition += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Open-ended questions to help you gather information during your appointment', margin, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    data.questionsForProvider.forEach((q, index) => {
      if (yPosition > pageHeight - margin - 40) {
        doc.addPage();
        yPosition = margin;
      }

      // Context
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      const contextLines = doc.splitTextToSize(`Based on: ${q.context}`, pageWidth - 2 * margin - 5);
      doc.text(contextLines, margin, yPosition);
      yPosition += contextLines.length * 4 + 2;

      // Question
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      const questionLines = doc.splitTextToSize(`${index + 1}. "${q.question}"`, pageWidth - 2 * margin);
      doc.text(questionLines, margin, yPosition);
      doc.setFont('helvetica', 'normal');
      yPosition += questionLines.length * 5 + 5;
    });

    yPosition += 10;
  }

  // === DISCLAIMER ===
  // Always add disclaimer at the bottom of the last page
  const disclaimerY = pageHeight - 35;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, disclaimerY - 5, pageWidth - margin, disclaimerY - 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);

  const disclaimer = 'MEDICAL DISCLAIMER: This report is AI-generated to assist clinical discussions. ' +
    'It does NOT constitute medical advice, diagnosis, or treatment recommendations. ' +
    'Discussion points and questions are conversation starters based on data patterns, not clinical guidance. ' +
    'All medical decisions should be made by licensed healthcare providers.';

  const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - 2 * margin);
  let disclaimerYPos = disclaimerY;
  disclaimerLines.forEach((line: string) => {
    doc.text(line, margin, disclaimerYPos);
    disclaimerYPos += 3;
  });

  // === FOOTER (on every page) ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      `Generated by MyGuide Health - ${data.reportInfo.generatedDate}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  // Download the PDF
  const defaultFilename = `Clinical_Note_${data.patientInfo.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename || defaultFilename);
}
