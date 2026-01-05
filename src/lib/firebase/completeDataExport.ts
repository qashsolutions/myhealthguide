/**
 * Complete Data Export Service
 * Exports ALL user data in JSON and PDF formats
 * Required for GDPR compliance and trial expiration grace period
 */

import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './config';
import { generateHealthReportPDF } from '../utils/pdfExport';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Convert Firestore Timestamp or various date formats to JavaScript Date
 */
function convertToDate(value: any): Date {
  if (!value) return new Date();

  // Already a Date object
  if (value instanceof Date) return value;

  // Firestore Timestamp object
  if (typeof value === 'object' && 'seconds' in value) {
    return new Date(value.seconds * 1000);
  }

  // Firestore Timestamp with toDate method
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate();
  }

  // ISO string or other parseable format
  if (typeof value === 'string') {
    return new Date(value);
  }

  // Number (milliseconds)
  if (typeof value === 'number') {
    return new Date(value);
  }

  return new Date();
}

export interface CompleteDataExport {
  exportDate: string;
  user: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    subscriptionStatus: string;
    trialStartDate: string | null;
    trialEndDate: string | null;
    createdAt: string;
  };
  groups: any[];
  elders: any[];
  medications: any[];
  medicationLogs: any[];
  supplements: any[];
  supplementLogs: any[];
  dietEntries: any[];
  activityLogs: any[];
  notificationLogs: any[];
  reminderSchedules: any[];
  phiAuditLogs: any[];
}

/**
 * Export all user data to ZIP file containing JSON + PDFs
 */
export async function exportAllUserData(userId: string): Promise<void> {
  try {
    console.log('Starting complete data export for user:', userId);

    // Get user document
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();

    // Collect all data
    const exportData: CompleteDataExport = {
      exportDate: new Date().toISOString(),
      user: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        subscriptionStatus: userData.subscriptionStatus,
        trialStartDate: userData.trialStartDate?.toDate().toISOString() || null,
        trialEndDate: userData.trialEndDate?.toDate().toISOString() || null,
        createdAt: userData.createdAt?.toDate().toISOString()
      },
      groups: [],
      elders: [],
      medications: [],
      medicationLogs: [],
      supplements: [],
      supplementLogs: [],
      dietEntries: [],
      activityLogs: [],
      notificationLogs: [],
      reminderSchedules: [],
      phiAuditLogs: []
    };

    // Get all groups where user is a member
    const groupIds = userData.groups?.map((g: any) => g.groupId) || [];

    for (const groupId of groupIds) {
      // Get group data
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (groupDoc.exists()) {
        exportData.groups.push({ id: groupDoc.id, ...groupDoc.data() });
      }

      // Get elders in this group
      const eldersSnap = await getDocs(
        query(collection(db, 'elders'), where('groupId', '==', groupId))
      );
      eldersSnap.forEach(doc => {
        exportData.elders.push({ id: doc.id, ...doc.data() });
      });

      // Get medications
      const medsSnap = await getDocs(
        query(collection(db, 'medications'), where('groupId', '==', groupId))
      );
      medsSnap.forEach(doc => {
        exportData.medications.push({ id: doc.id, ...doc.data() });
      });

      // Get medication logs
      const medLogsSnap = await getDocs(
        query(collection(db, 'medication_logs'), where('groupId', '==', groupId))
      );
      medLogsSnap.forEach(doc => {
        exportData.medicationLogs.push({ id: doc.id, ...doc.data() });
      });

      // Get supplements
      const suppsSnap = await getDocs(
        query(collection(db, 'supplements'), where('groupId', '==', groupId))
      );
      suppsSnap.forEach(doc => {
        exportData.supplements.push({ id: doc.id, ...doc.data() });
      });

      // Get supplement logs
      const suppLogsSnap = await getDocs(
        query(collection(db, 'supplement_logs'), where('groupId', '==', groupId))
      );
      suppLogsSnap.forEach(doc => {
        exportData.supplementLogs.push({ id: doc.id, ...doc.data() });
      });

      // Get diet entries
      const dietSnap = await getDocs(
        query(collection(db, 'diet_entries'), where('groupId', '==', groupId))
      );
      dietSnap.forEach(doc => {
        exportData.dietEntries.push({ id: doc.id, ...doc.data() });
      });

      // Get activity logs
      const activitySnap = await getDocs(
        query(collection(db, 'activity_logs'), where('groupId', '==', groupId))
      );
      activitySnap.forEach(doc => {
        exportData.activityLogs.push({ id: doc.id, ...doc.data() });
      });

      // Get notification logs
      const notifSnap = await getDocs(
        query(collection(db, 'notification_logs'), where('groupId', '==', groupId))
      );
      notifSnap.forEach(doc => {
        exportData.notificationLogs.push({ id: doc.id, ...doc.data() });
      });

      // Get reminder schedules
      const reminderSnap = await getDocs(
        query(collection(db, 'reminder_schedules'), where('groupId', '==', groupId))
      );
      reminderSnap.forEach(doc => {
        exportData.reminderSchedules.push({ id: doc.id, ...doc.data() });
      });
    }

    // Get PHI audit logs
    const phiLogsSnap = await getDocs(
      query(collection(db, 'phi_audit_logs'), where('userId', '==', userId))
    );
    phiLogsSnap.forEach(doc => {
      exportData.phiAuditLogs.push({ id: doc.id, ...doc.data() });
    });

    console.log('Data collection complete:', {
      elders: exportData.elders.length,
      medications: exportData.medications.length,
      logs: exportData.medicationLogs.length
    });

    // Create ZIP file
    const zip = new JSZip();

    // Add JSON export
    zip.file('complete-data-export.json', JSON.stringify(exportData, null, 2));

    // Add README
    const readme = `MyGuide.Health Complete Data Export
=====================================

Export Date: ${new Date().toLocaleString()}
User: ${userData.firstName} ${userData.lastName}
Email: ${userData.email}

This archive contains:
- complete-data-export.json: All your data in JSON format
- elder-reports/: Individual PDF reports for each elder
- phi-audit-log.json: Complete PHI access audit trail (HIPAA)

IMPORTANT: This data contains Protected Health Information (PHI).
Store securely and delete when no longer needed.

For questions: support@myguide.health
`;
    zip.file('README.txt', readme);

    // Add PHI Audit Log separately (HIPAA requirement)
    zip.file('phi-audit-log.json', JSON.stringify({
      exportDate: new Date().toISOString(),
      userId: userId,
      userEmail: userData.email,
      logs: exportData.phiAuditLogs
    }, null, 2));

    // Generate PDF reports for each elder
    const elderReportsFolder = zip.folder('elder-reports');

    for (const elder of exportData.elders) {
      try {
        // Get logs for this elder
        const elderMedLogs = exportData.medicationLogs.filter(
          (log: any) => log.elderId === elder.id
        );
        const elderDietEntries = exportData.dietEntries.filter(
          (entry: any) => entry.elderId === elder.id
        );
        const elderMeds = exportData.medications.filter(
          (med: any) => med.elderId === elder.id
        );

        // Generate PDF for each elder with data
        const elderName = elder.name || elder.firstName || 'Unknown';
        console.log(`Generating PDF for elder: ${elderName}`);

        // Calculate date range (last 30 days or all data)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Convert medication logs to proper format with Date objects
        const formattedMedLogs = elderMedLogs.map((log: any) => ({
          ...log,
          scheduledTime: convertToDate(log.scheduledTime),
          takenAt: log.takenAt ? convertToDate(log.takenAt) : null,
        }));

        // Convert diet entries to proper format
        const formattedDietEntries = elderDietEntries.map((entry: any) => ({
          ...entry,
          timestamp: convertToDate(entry.timestamp || entry.createdAt),
        }));

        // Format medications for PDF
        const formattedMeds = elderMeds.map((med: any) => ({
          id: med.id,
          name: med.name || 'Unknown Medication',
          dosage: med.dosage || 'N/A',
        }));

        // Generate PDF as blob
        const pdfBlob = await generateHealthReportPDF({
          elderName: elderName,
          startDate: thirtyDaysAgo,
          endDate: now,
          medicationLogs: formattedMedLogs,
          dietEntries: formattedDietEntries,
          medications: formattedMeds,
        }, true);

        if (pdfBlob && elderReportsFolder) {
          const safeElderName = elderName.replace(/[^a-zA-Z0-9]/g, '_');
          elderReportsFolder.file(
            `Health_Report_${safeElderName}_${now.toISOString().split('T')[0]}.pdf`,
            pdfBlob
          );
          console.log(`✅ PDF generated for elder: ${elderName}`);
        }
      } catch (error) {
        console.error(`Error generating PDF for elder ${elder.id}:`, error);
      }
    }

    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const fileName = `myguide-health-export-${new Date().toISOString().split('T')[0]}.zip`;

    saveAs(zipBlob, fileName);

    console.log('Export complete:', fileName);

  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
}

/**
 * Calculate approximate export size
 */
export async function estimateExportSize(userId: string): Promise<number> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return 0;

    const userData = userDoc.data();
    const groupIds = userData.groups?.map((g: any) => g.groupId) || [];

    let totalRecords = 0;

    for (const groupId of groupIds) {
      const eldersSnap = await getDocs(
        query(collection(db, 'elders'), where('groupId', '==', groupId))
      );
      totalRecords += eldersSnap.size;

      const medsSnap = await getDocs(
        query(collection(db, 'medications'), where('groupId', '==', groupId))
      );
      totalRecords += medsSnap.size;

      const logsSnap = await getDocs(
        query(collection(db, 'medication_logs'), where('groupId', '==', groupId))
      );
      totalRecords += logsSnap.size;
    }

    // Rough estimate: 1KB per record
    return totalRecords * 1024;
  } catch (error) {
    console.error('Error estimating export size:', error);
    return 0;
  }
}
