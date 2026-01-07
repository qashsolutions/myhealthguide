/**
 * Data Export Service
 * GDPR Compliance - Right to Data Portability
 *
 * Exports all user data in JSON format
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from './config';

export interface UserDataExport {
  exportDate: string;
  user: any;
  groups: any[];
  elders: any[];
  medications: any[];
  medicationLogs: any[];
  supplements: any[];
  supplementLogs: any[];
  dietEntries: any[];
  activityLogs: any[];
  notificationLogs: any[];
  invitesCreated: any[];
  invitesAccepted: any[];
}

export class DataExportService {
  /**
   * Export all data for a user across all their groups
   * Only group admins can export
   */
  static async exportAllUserData(userId: string): Promise<UserDataExport> {
    try {
      const exportData: UserDataExport = {
        exportDate: new Date().toISOString(),
        user: null,
        groups: [],
        elders: [],
        medications: [],
        medicationLogs: [],
        supplements: [],
        supplementLogs: [],
        dietEntries: [],
        activityLogs: [],
        notificationLogs: [],
        invitesCreated: [],
        invitesAccepted: []
      };

      // 1. Export user profile
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        exportData.user = {
          id: userDoc.id,
          ...userDoc.data(),
          // Exclude sensitive hashes
          phoneNumberHash: '[REDACTED]'
        };
      }

      // Get all groups where user is admin
      const groupsSnapshot = await getDocs(
        query(collection(db, 'groups'), where('adminId', '==', userId))
      );

      const groupIds: string[] = [];

      // 2. Export groups
      for (const groupDoc of groupsSnapshot.docs) {
        const groupData = groupDoc.data();
        groupIds.push(groupDoc.id);
        exportData.groups.push({
          id: groupDoc.id,
          ...groupData
        });
      }

      // 3. Export elders from user's groups
      for (const groupId of groupIds) {
        const eldersSnapshot = await getDocs(
          query(collection(db, 'elders'), where('groupId', '==', groupId))
        );

        eldersSnapshot.docs.forEach(doc => {
          exportData.elders.push({
            id: doc.id,
            ...doc.data()
          });
        });
      }

      // 4. Export medications
      for (const groupId of groupIds) {
        const medsSnapshot = await getDocs(
          query(collection(db, 'medications'), where('groupId', '==', groupId))
        );

        medsSnapshot.docs.forEach(doc => {
          exportData.medications.push({
            id: doc.id,
            ...doc.data()
          });
        });
      }

      // 5. Export medication logs
      for (const groupId of groupIds) {
        const logsSnapshot = await getDocs(
          query(collection(db, 'medication_logs'), where('groupId', '==', groupId))
        );

        logsSnapshot.docs.forEach(doc => {
          exportData.medicationLogs.push({
            id: doc.id,
            ...doc.data()
          });
        });
      }

      // 6. Export supplements
      for (const groupId of groupIds) {
        const suppsSnapshot = await getDocs(
          query(collection(db, 'supplements'), where('groupId', '==', groupId))
        );

        suppsSnapshot.docs.forEach(doc => {
          exportData.supplements.push({
            id: doc.id,
            ...doc.data()
          });
        });
      }

      // 7. Export supplement logs
      for (const groupId of groupIds) {
        const logsSnapshot = await getDocs(
          query(collection(db, 'supplement_logs'), where('groupId', '==', groupId))
        );

        logsSnapshot.docs.forEach(doc => {
          exportData.supplementLogs.push({
            id: doc.id,
            ...doc.data()
          });
        });
      }

      // 8. Export diet entries
      for (const groupId of groupIds) {
        const dietSnapshot = await getDocs(
          query(collection(db, 'diet_entries'), where('groupId', '==', groupId))
        );

        dietSnapshot.docs.forEach(doc => {
          exportData.dietEntries.push({
            id: doc.id,
            ...doc.data()
          });
        });
      }

      // 9. Export activity logs
      for (const groupId of groupIds) {
        const activitySnapshot = await getDocs(
          query(collection(db, 'activity_logs'), where('groupId', '==', groupId))
        );

        activitySnapshot.docs.forEach(doc => {
          exportData.activityLogs.push({
            id: doc.id,
            ...doc.data()
          });
        });
      }

      // 10. Export notification logs
      for (const groupId of groupIds) {
        const notifSnapshot = await getDocs(
          query(collection(db, 'notification_logs'), where('groupId', '==', groupId))
        );

        notifSnapshot.docs.forEach(doc => {
          exportData.notificationLogs.push({
            id: doc.id,
            ...doc.data()
          });
        });
      }

      // 11. Export invites created by user
      const invitesSnapshot = await getDocs(
        query(collection(db, 'invites'), where('createdBy', '==', userId))
      );

      invitesSnapshot.docs.forEach(doc => {
        exportData.invitesCreated.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // 12. Export invite acceptances
      const acceptancesSnapshot = await getDocs(
        query(collection(db, 'invite_acceptances'), where('userId', '==', userId))
      );

      acceptancesSnapshot.docs.forEach(doc => {
        exportData.invitesAccepted.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return exportData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  /**
   * Download data as JSON file
   */
  static downloadAsJSON(data: UserDataExport, filename?: string): void {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `myguide-data-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Download data as CSV files (one per collection type)
   */
  static downloadAsCSV(data: UserDataExport): void {
    // Helper to convert array of objects to CSV
    const arrayToCSV = (arr: any[], filename: string) => {
      if (arr.length === 0) return;

      const headers = Object.keys(arr[0]);
      const csvContent = [
        headers.join(','),
        ...arr.map(row =>
          headers.map(header => {
            const value = row[header];
            // Handle commas and quotes in values
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    // Export each collection as separate CSV
    const date = new Date().toISOString().split('T')[0];

    arrayToCSV(data.elders, `elders-${date}.csv`);
    arrayToCSV(data.medications, `medications-${date}.csv`);
    arrayToCSV(data.medicationLogs, `medication-logs-${date}.csv`);
    arrayToCSV(data.supplements, `supplements-${date}.csv`);
    arrayToCSV(data.supplementLogs, `supplement-logs-${date}.csv`);
    arrayToCSV(data.dietEntries, `diet-entries-${date}.csv`);
    arrayToCSV(data.activityLogs, `activity-logs-${date}.csv`);
  }

  /**
   * Get export summary (counts)
   */
  static getExportSummary(data: UserDataExport): {
    label: string;
    count: number;
  }[] {
    return [
      { label: 'Groups', count: data.groups.length },
      { label: 'Loved Ones', count: data.elders.length },
      { label: 'Medications', count: data.medications.length },
      { label: 'Medication Logs', count: data.medicationLogs.length },
      { label: 'Supplements', count: data.supplements.length },
      { label: 'Supplement Logs', count: data.supplementLogs.length },
      { label: 'Diet Entries', count: data.dietEntries.length },
      { label: 'Activity Logs', count: data.activityLogs.length },
      { label: 'Notification Logs', count: data.notificationLogs.length },
      { label: 'Invites Created', count: data.invitesCreated.length },
      { label: 'Invites Accepted', count: data.invitesAccepted.length }
    ];
  }
}
