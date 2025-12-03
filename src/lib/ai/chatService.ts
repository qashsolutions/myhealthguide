/**
 * AI Chat Service - Gemini Integration
 * Natural language assistant for caregivers
 * Phase 4: Action Execution
 */

import { collection, addDoc, query, orderBy, getDocs, Timestamp, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ActionHandler } from './actionHandler';
import { AgencyService } from '@/lib/firebase/agencies';
import { AgencyRole } from '@/types';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  userId: string;
  groupId?: string;
  actions?: ChatAction[];
}

export interface ChatAction {
  type: 'create_reminder' | 'send_sms' | 'log_dose' | 'update_schedule' | 'invite_member';
  status: 'pending' | 'completed' | 'failed';
  data: any;
  error?: string;
}

export interface ChatContext {
  userId: string;
  groupId: string;
  agencyId?: string; // Phase 5: Agency multi-tenant support
  agencyRole?: AgencyRole; // Phase 5: User's role in the agency
  assignedElderIds?: string[]; // Phase 5: Elders assigned to this caregiver
  elders: any[];
  medications: any[];
  upcomingSchedules: any[];
  groupMembers: any[];
}

/**
 * Generate AI response using Gemini
 */
export async function generateChatResponse(
  userMessage: string,
  context: ChatContext,
  conversationHistory: ChatMessage[] = []
): Promise<{ response: string; actions?: ChatAction[] }> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      response: "I'm currently offline. Please try again later or contact support.",
    };
  }

  try {
    // Build context prompt
    const contextPrompt = buildContextPrompt(context);

    // Build conversation history
    const historyPrompt = conversationHistory
      .slice(-5) // Last 5 messages for context
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    // System prompt
    const systemPrompt = `You are a helpful AI assistant for caregivers managing elderly care.
You help track medications, schedules, diet, and coordinate with family members.

Current Context:
${contextPrompt}

Previous Conversation:
${historyPrompt}

Guidelines:
- Be concise and helpful
- Use natural, caring language
- When asked about schedules or medications, reference the context above
- If you can help with an action (create reminder, send SMS), offer to do so
- Always confirm before taking actions
- Use friendly, supportive tone

User Question: ${userMessage}`;

    // Call Gemini 3 Pro API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: systemPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
            thinking_config: {
              include_thoughts: false // Chat is conversational, not deep reasoning
            }
          },
        }),
      }
    );

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'm sorry, I couldn't process that. Could you rephrase?";

    // Detect if actions are needed
    const actions = detectActions(userMessage, context);

    // Execute actions if detected
    let actionResults: string[] = [];
    if (actions.length > 0) {
      for (const action of actions) {
        try {
          const result = await ActionHandler.executeAction(action, {
            userId: context.userId,
            groupId: context.groupId,
            agencyId: context.agencyId,
            agencyRole: context.agencyRole,
            assignedElderIds: context.assignedElderIds,
            elderIds: context.elders.map(e => e.id).filter(Boolean) as string[]
          });

          if (result.success) {
            actionResults.push(result.message);
            action.status = 'completed';
          } else {
            actionResults.push(`❌ ${result.message}`);
            action.status = 'failed';
            action.error = result.error;
          }
        } catch (error: any) {
          action.status = 'failed';
          action.error = error.message;
          actionResults.push(`❌ Failed to execute action: ${error.message}`);
        }
      }
    }

    // Append action results to AI response
    let finalResponse = aiResponse;
    if (actionResults.length > 0) {
      finalResponse += '\n\n' + actionResults.join('\n');
    }

    return {
      response: finalResponse,
      actions: actions.length > 0 ? actions : undefined,
    };
  } catch (error) {
    console.error('Error generating chat response:', error);
    return {
      response: "I encountered an error. Please try again or contact support.",
    };
  }
}

/**
 * Build context prompt from user's data
 */
function buildContextPrompt(context: ChatContext): string {
  const { elders, medications, upcomingSchedules, groupMembers } = context;

  let prompt = '';

  // Elders
  if (elders.length > 0) {
    prompt += 'Elders under care:\n';
    elders.forEach(elder => {
      prompt += `- ${elder.firstName} ${elder.lastName} (${elder.relationship || 'family member'})\n`;
    });
    prompt += '\n';
  }

  // Upcoming medications
  if (upcomingSchedules.length > 0) {
    prompt += 'Upcoming medication schedules (next 24 hours):\n';
    upcomingSchedules.slice(0, 5).forEach(schedule => {
      prompt += `- ${schedule.medicationName} for ${schedule.elderName} at ${schedule.time}\n`;
    });
    prompt += '\n';
  }

  // Active medications
  if (medications.length > 0) {
    prompt += 'Active medications:\n';
    medications.slice(0, 10).forEach(med => {
      prompt += `- ${med.name}: ${med.dosage} ${med.frequency}\n`;
    });
    prompt += '\n';
  }

  // Group members
  if (groupMembers.length > 0) {
    prompt += 'Family/Care team members:\n';
    groupMembers.forEach(member => {
      prompt += `- ${member.name} (${member.role})\n`;
    });
    prompt += '\n';
  }

  return prompt || 'No context available.';
}

/**
 * Detect actions from user message
 */
function detectActions(userMessage: string, context: ChatContext): ChatAction[] {
  const actions: ChatAction[] = [];
  const lowerMessage = userMessage.toLowerCase();

  // Detect reminder requests
  if (
    lowerMessage.includes('remind') ||
    lowerMessage.includes('reminder') ||
    lowerMessage.includes('alert me')
  ) {
    actions.push({
      type: 'create_reminder',
      status: 'pending',
      data: { message: userMessage },
    });
  }

  // Detect SMS requests
  if (
    (lowerMessage.includes('send') || lowerMessage.includes('text')) &&
    (lowerMessage.includes('sms') || lowerMessage.includes('message') || lowerMessage.includes('brother') || lowerMessage.includes('sister'))
  ) {
    actions.push({
      type: 'send_sms',
      status: 'pending',
      data: { message: userMessage },
    });
  }

  // Detect dose logging
  if (
    lowerMessage.includes('mark') ||
    lowerMessage.includes('log') ||
    lowerMessage.includes('taken') ||
    lowerMessage.includes('gave')
  ) {
    actions.push({
      type: 'log_dose',
      status: 'pending',
      data: { message: userMessage },
    });
  }

  return actions;
}

/**
 * Save chat message to Firestore
 */
export async function saveChatMessage(message: Omit<ChatMessage, 'id'>): Promise<string> {
  try {
    // Build the document data, excluding undefined fields
    // Firestore doesn't accept undefined values
    const docData: Record<string, any> = {
      role: message.role,
      content: message.content,
      timestamp: Timestamp.fromDate(message.timestamp),
      userId: message.userId,
    };

    // Only add optional fields if they have values
    if (message.groupId) {
      docData.groupId = message.groupId;
    }
    if (message.actions && message.actions.length > 0) {
      docData.actions = message.actions;
    }

    const docRef = await addDoc(collection(db, `chat_history/${message.userId}/messages`), docData);
    return docRef.id;
  } catch (error) {
    console.error('Error saving chat message:', error);
    throw error;
  }
}

/**
 * Get chat history for user
 */
export async function getChatHistory(
  userId: string,
  messageLimit: number = 50
): Promise<ChatMessage[]> {
  try {
    const q = query(
      collection(db, `chat_history/${userId}/messages`),
      orderBy('timestamp', 'desc'),
      limit(messageLimit)
    );

    const querySnapshot = await getDocs(q);
    const messages: ChatMessage[] = [];

    querySnapshot.forEach(doc => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        role: data.role,
        content: data.content,
        timestamp: data.timestamp.toDate(),
        userId: data.userId,
        groupId: data.groupId,
        actions: data.actions,
      });
    });

    return messages.reverse(); // Oldest first
  } catch (error) {
    console.error('Error getting chat history:', error);
    return [];
  }
}
