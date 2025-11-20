/**
 * AI Action Handler Service
 * Executes actions detected from AI chat
 * Phase 4: AI Action Execution
 */

import { MedicationService } from '@/lib/firebase/medications';
import { NotificationService } from '@/lib/firebase/notifications';
import { GroupService } from '@/lib/firebase/groups';
import { AgencyService } from '@/lib/firebase/agencies';
import { ChatAction } from './chatService';
import { format, parse, addHours } from 'date-fns';
import { AgencyRole } from '@/types';

export interface ActionResult {
  success: boolean;
  message: string;
  error?: string;
  data?: any;
}

export interface ActionContext {
  userId: string;
  groupId: string;
  agencyId?: string;
  agencyRole?: AgencyRole;
  assignedElderIds?: string[];
  elderIds?: string[];
}

export class ActionHandler {
  /**
   * Check if user has access to an elder (Phase 5: Agency isolation)
   */
  private static async canAccessElder(
    elderId: string,
    context: ActionContext
  ): Promise<boolean> {
    // No agency context = legacy single-user group (full access)
    if (!context.agencyId || !context.agencyRole) {
      return true;
    }

    // Super admin has access to all elders
    if (context.agencyRole === 'super_admin') {
      return true;
    }

    // Check if elder is in assigned elders list
    if (context.assignedElderIds && context.assignedElderIds.includes(elderId)) {
      return true;
    }

    // Double-check with agency service (database query)
    return await AgencyService.canAccessElder(
      context.userId,
      elderId,
      context.agencyId
    );
  }

  /**
   * Execute a chat action
   */
  static async executeAction(
    action: ChatAction,
    context: ActionContext
  ): Promise<ActionResult> {
    try {
      switch (action.type) {
        case 'create_reminder':
          return await this.handleCreateReminder(action, context);

        case 'send_sms':
          return await this.handleSendSMS(action, context);

        case 'log_dose':
          return await this.handleLogDose(action, context);

        case 'update_schedule':
          return await this.handleUpdateSchedule(action, context);

        case 'invite_member':
          return await this.handleInviteMember(action, context);

        default:
          return {
            success: false,
            message: 'Unknown action type',
            error: `Action type "${action.type}" is not supported`
          };
      }
    } catch (error: any) {
      console.error('Error executing action:', error);
      return {
        success: false,
        message: 'Failed to execute action',
        error: error.message
      };
    }
  }

  /**
   * Handle: Create reminder
   * Example: "Remind me to give Dad his pills at 8pm"
   */
  private static async handleCreateReminder(
    action: ChatAction,
    context: ActionContext
  ): Promise<ActionResult> {
    try {
      const message = action.data.message as string;

      // Extract time from message (simple parsing)
      const timeMatch = message.match(/(\d{1,2})\s*(am|pm|AM|PM)/);
      const time = timeMatch ? `${timeMatch[1]}:00 ${timeMatch[2].toUpperCase()}` : '12:00 PM';

      // Parse time to get scheduled Date
      const now = new Date();
      const scheduledTime = parse(time, 'h:mm a', now);

      // If time is in the past today, schedule for tomorrow
      if (scheduledTime < now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      // Extract medication name (simple heuristic)
      const medMatch = message.match(/(?:give|take)\s+(?:their|his|her)?\s*([a-zA-Z\s]+?)(?:\s+at|\s+medication)/i);
      const medicationName = medMatch ? medMatch[1].trim() : 'medication';

      // Create reminder schedule
      const scheduleId = await NotificationService.createReminderSchedule({
        groupId: context.groupId,
        elderId: context.elderIds?.[0] || '',
        type: 'medication',
        scheduledTime: scheduledTime,
        recipients: [context.userId], // Remind the requesting user
        enabled: true
      });

      return {
        success: true,
        message: `✅ Reminder set for ${format(scheduledTime, 'h:mm a')} - ${medicationName}`,
        data: { scheduleId, time: format(scheduledTime, 'h:mm a') }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to create reminder',
        error: error.message
      };
    }
  }

  /**
   * Handle: Send SMS/Notification
   * Example: "Send a text to my brother about dinner"
   */
  private static async handleSendSMS(
    action: ChatAction,
    context: ActionContext
  ): Promise<ActionResult> {
    try {
      const message = action.data.message as string;

      // Extract recipient (simple parsing)
      const recipientMatch = message.match(/(?:to|text)\s+(my\s+)?([a-zA-Z]+)/i);
      const recipient = recipientMatch ? recipientMatch[2] : 'family member';

      // Extract message content
      const aboutMatch = message.match(/about\s+(.+)/i);
      const about = aboutMatch ? aboutMatch[1] : 'a reminder';

      // For now, we'll queue a notification instead of SMS
      // In production, this would integrate with actual SMS service
      await NotificationService.logNotification({
        groupId: context.groupId,
        elderId: '', // Not specific to an elder
        type: 'daily_summary',
        recipient: recipient,
        message: `Message about: ${about}`,
        status: 'sent'
      });

      return {
        success: true,
        message: `✅ Notification queued for ${recipient} about ${about}`,
        data: { recipient, content: about }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to send notification',
        error: error.message
      };
    }
  }

  /**
   * Handle: Log medication dose
   * Example: "Mark Dad's blood pressure medicine as taken"
   * Phase 5: Now includes agency access check
   */
  private static async handleLogDose(
    action: ChatAction,
    context: ActionContext
  ): Promise<ActionResult> {
    try {
      const message = action.data.message as string;

      if (!context.elderIds || context.elderIds.length === 0) {
        return {
          success: false,
          message: 'Please select an elder first',
          error: 'No elder selected'
        };
      }

      const elderId = context.elderIds[0];

      // Phase 5: Check if user has access to this elder (agency isolation)
      const hasAccess = await this.canAccessElder(elderId, context);
      if (!hasAccess) {
        return {
          success: false,
          message: 'You do not have access to this elder',
          error: 'Access denied - elder not assigned to you'
        };
      }

      // Extract medication name
      const medMatch = message.match(/(?:mark|log)\s+(?:.*?)\s*([a-zA-Z\s]+?)\s+(?:as|medicine)/i);
      const medicationName = medMatch ? medMatch[1].trim() : 'medication';

      // Get medications for this elder
      // Note: For actionHandler, we don't have explicit user role information in context
      // We'll use 'member' as default role since context.userId exists and has access to this elder
      const userRole = 'member' as 'admin' | 'caregiver' | 'member';
      const medications = await MedicationService.getMedicationsByElder(elderId, context.userId, userRole);

      // Find matching medication (fuzzy match)
      const medication = medications?.find(med =>
        med.name.toLowerCase().includes(medicationName.toLowerCase()) ||
        medicationName.toLowerCase().includes(med.name.toLowerCase())
      );

      if (!medication) {
        return {
          success: false,
          message: `Could not find medication matching "${medicationName}"`,
          error: 'Medication not found'
        };
      }

      // Log the dose as taken
      const now = new Date();
      const log = await MedicationService.logDose({
        groupId: context.groupId,
        elderId: elderId,
        medicationId: medication.id!,
        scheduledTime: now, // For manual logs, scheduled = actual
        actualTime: now,
        status: 'taken',
        loggedBy: context.userId,
        method: 'manual',
        notes: `Logged via AI chat: "${message}"`,
        createdAt: now
      }, context.userId, userRole);

      return {
        success: true,
        message: `✅ Logged ${medication.name} as taken`,
        data: { logId: log.id, medicationName: medication.name }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to log medication',
        error: error.message
      };
    }
  }

  /**
   * Handle: Update medication schedule
   * Example: "Change Mom's medication time to 9am"
   */
  private static async handleUpdateSchedule(
    action: ChatAction,
    context: ActionContext
  ): Promise<ActionResult> {
    try {
      const message = action.data.message as string;

      // Extract new time
      const timeMatch = message.match(/to\s+(\d{1,2})\s*(am|pm|AM|PM)/i);

      if (!timeMatch) {
        return {
          success: false,
          message: 'Could not understand the new time. Please specify like "9am" or "2:30pm"',
          error: 'Time not found'
        };
      }

      const newTime = `${timeMatch[1]}:00 ${timeMatch[2].toUpperCase()}`;

      return {
        success: true,
        message: `⚠️ Schedule update requires confirmation. Would you like to change the medication time to ${newTime}?`,
        data: {
          newTime,
          requiresConfirmation: true,
          action: 'update_schedule'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to update schedule',
        error: error.message
      };
    }
  }

  /**
   * Handle: Invite member
   * Example: "Invite Sarah to the group"
   */
  private static async handleInviteMember(
    action: ChatAction,
    context: ActionContext
  ): Promise<ActionResult> {
    try {
      // Get or generate invite code
      let inviteCode = await GroupService.getInviteCode(context.groupId);

      if (!inviteCode) {
        // Generate new code
        inviteCode = await GroupService.generateGroupInviteCode(context.groupId, context.userId);
      }

      return {
        success: true,
        message: `✅ Share this invite code: **${inviteCode}**\n\nThey can join at: /dashboard/join`,
        data: { inviteCode }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to generate invite code',
        error: error.message
      };
    }
  }

  /**
   * Parse natural language to extract action details
   * This is a simple implementation - in production, use Gemini function calling
   */
  static parseActionDetails(message: string, actionType: string): Record<string, any> {
    const details: Record<string, any> = {};

    // Extract time
    const timeMatch = message.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)/i);
    if (timeMatch) {
      details.time = `${timeMatch[1]}:${timeMatch[2] || '00'} ${timeMatch[3].toUpperCase()}`;
    }

    // Extract medication name
    const medMatch = message.match(/(?:give|take|mark|log)\s+(?:their|his|her|my)?\s*([a-zA-Z\s]+?)(?:\s+at|\s+as|\s+medicine|\s+medication)/i);
    if (medMatch) {
      details.medication = medMatch[1].trim();
    }

    // Extract person name
    const personMatch = message.match(/(?:to|for)\s+(my\s+)?([A-Z][a-z]+)/);
    if (personMatch) {
      details.person = personMatch[2];
    }

    return details;
  }

  /**
   * Check if action requires confirmation
   */
  static requiresConfirmation(actionType: string): boolean {
    const destructiveActions = ['update_schedule', 'invite_member'];
    return destructiveActions.includes(actionType);
  }

  /**
   * Generate confirmation message
   */
  static getConfirmationMessage(action: ChatAction, details: Record<string, any>): string {
    switch (action.type) {
      case 'update_schedule':
        return `Are you sure you want to change the medication schedule to ${details.newTime}?`;

      case 'invite_member':
        return `This will generate/show an invite code. Anyone with this code can request to join. Continue?`;

      default:
        return 'Are you sure you want to perform this action?';
    }
  }
}
