'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Send, Sparkles, MessageSquare, Loader2 } from 'lucide-react';
import { saveChatMessage, getChatHistory, ChatMessage, ChatContext, ChatAction } from '@/lib/ai/chatService';
import { ActionHandler } from '@/lib/ai/actionHandler';
import { format } from 'date-fns';

interface AIChatProps {
  context: ChatContext;
}

export function AIChat({ context }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, [context.userId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setListening(false);
        };

        recognitionRef.current.onerror = () => {
          setListening(false);
        };

        recognitionRef.current.onend = () => {
          setListening(false);
        };
      }
    }
  }, []);

  const loadChatHistory = async () => {
    try {
      const history = await getChatHistory(context.userId, 20);
      setMessages(history);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
      userId: context.userId,
      groupId: context.groupId,
    };

    // Add user message to UI
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Save user message
      await saveChatMessage(userMessage);

      // Get AI response via API route (server-side has GEMINI_API_KEY)
      const apiResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          context,
          conversationHistory: messages,
        }),
      });

      if (!apiResponse.ok) {
        throw new Error('Failed to get chat response');
      }

      const { response, actions } = await apiResponse.json();

      // Execute actions CLIENT-SIDE (where Firebase auth context exists)
      let finalResponse = response;
      let executedActions: ChatAction[] | undefined = actions;

      if (actions && actions.length > 0) {
        const actionResults: string[] = [];

        for (const action of actions) {
          try {
            const result = await ActionHandler.executeAction(action, {
              userId: context.userId,
              groupId: action.data?.groupId || context.groupId,
              agencyId: action.data?.agencyId || context.agencyId,
              agencyRole: action.data?.agencyRole || context.agencyRole,
              assignedElderIds: action.data?.assignedElderIds || context.assignedElderIds,
              elderIds: action.data?.elderIds || context.elders.map(e => e.id).filter(Boolean) as string[]
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

        if (actionResults.length > 0) {
          finalResponse += '\n\n' + actionResults.join('\n');
        }
        executedActions = actions;
      }

      // Create assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: finalResponse,
        timestamp: new Date(),
        userId: context.userId,
        groupId: context.groupId,
        actions: executedActions,
      };

      // Add to UI
      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message
      await saveChatMessage(assistantMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      // Show error message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
          userId: context.userId,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoice = () => {
    if (!voiceEnabled) {
      setVoiceEnabled(true);
    } else {
      setVoiceEnabled(false);
      if (listening) {
        recognitionRef.current?.stop();
        setListening(false);
      }
    }
  };

  const startListening = () => {
    if (recognitionRef.current && voiceEnabled) {
      setListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Smart Assistant
              </CardTitle>
              <CardDescription>
                Ask me anything about your care schedules, medications, or tasks
              </CardDescription>
            </div>
          </div>
          <Button
            variant={voiceEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={toggleVoice}
            className={voiceEnabled ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            {voiceEnabled ? (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Voice On
              </>
            ) : (
              <>
                <MicOff className="w-4 h-4 mr-2" />
                Voice Off
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start a Conversation
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
              Ask me about upcoming medications, schedules, or tell me to send reminders to family members.
            </p>
            <div className="mt-6 space-y-2 text-left">
              <p className="text-xs text-gray-500 dark:text-gray-400">Try asking:</p>
              <div className="space-y-1">
                <button
                  onClick={() => setInput("What medication is coming up for Dad?")}
                  className="block w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  💬 "What medication is coming up for Dad?"
                </button>
                <button
                  onClick={() => setInput("Show me today's schedule")}
                  className="block w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  💬 "Show me today's schedule"
                </button>
                <button
                  onClick={() => setInput("Remind me to give Mom her medicine at 8pm")}
                  className="block w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  ⏰ "Remind me to give Mom her medicine at 8pm"
                </button>
                <button
                  onClick={() => setInput("Mark Dad's blood pressure medicine as taken")}
                  className="block w-full text-left px-3 py-2 text-sm bg-green-50 dark:bg-green-900/20 rounded hover:bg-green-100 dark:hover:bg-green-900/30"
                >
                  ✅ "Mark Dad's blood pressure medicine as taken"
                </button>
                <button
                  onClick={() => setInput("Invite Sarah to the group")}
                  className="block w-full text-left px-3 py-2 text-sm bg-purple-50 dark:bg-purple-900/20 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30"
                >
                  👥 "Invite Sarah to the group"
                </button>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {format(message.timestamp, 'h:mm a')}
                </p>
                {message.actions && message.actions.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.actions.map((action, i) => (
                      <div
                        key={i}
                        className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                          action.status === 'completed'
                            ? 'bg-green-500/20 dark:bg-green-500/30 text-green-900 dark:text-green-200'
                            : action.status === 'failed'
                            ? 'bg-red-500/20 dark:bg-red-500/30 text-red-900 dark:text-red-200'
                            : 'bg-blue-500/20 dark:bg-blue-500/30 text-blue-900 dark:text-blue-200'
                        }`}
                      >
                        <span>
                          {action.status === 'completed' ? '✅' : action.status === 'failed' ? '❌' : '📋'}
                        </span>
                        <span>
                          {action.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        {action.status === 'failed' && action.error && (
                          <span className="text-xs opacity-75">- {action.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      <div className="border-t p-4">
        <div className="flex gap-2">
          {voiceEnabled && (
            <Button
              variant={listening ? 'default' : 'outline'}
              size="icon"
              onClick={listening ? stopListening : startListening}
              className={listening ? 'bg-red-600 hover:bg-red-700 animate-pulse' : ''}
            >
              <Mic className="w-4 h-4" />
            </Button>
          )}
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={listening ? 'Listening...' : 'Ask me anything...'}
            disabled={loading || listening}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
