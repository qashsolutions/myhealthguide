'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VoiceRecordButton } from '@/components/voice/VoiceRecordButton';
import { Loader2, Send, MessageSquare, Sparkles, User, Bot, BarChart3, Info } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  chartData?: any;
  sources?: string[];
}

export default function HealthChatPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !user || !selectedElder) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await fetch('/api/medgemma/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userRole: 'admin',
          groupId: selectedElder.groupId,
          elderId: selectedElder.id,
          elderName: selectedElder.name,
          query: message,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.data.answer,
          timestamp: new Date(),
          chartData: result.data.chartData,
          sources: result.data.sources,
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your query. Please try again.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Query error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = (transcript: string) => {
    setInputValue(transcript);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const exampleQueries = [
    'What is the medication compliance for the last 30 days?',
    'How many doses were missed this week?',
    'Show me the diet entries from yesterday',
    'What medications is grandma taking?',
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            Health Chat
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Ask questions about health data in natural language
          </p>
        </div>
      </div>

      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-4 mb-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-blue-900 dark:text-blue-100">Powered by MedGemma 27B</p>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              Ask questions about medications, diet, and compliance in plain English. The AI will retrieve and analyze your data.
            </p>
          </div>
        </div>
      </Card>

      {messages.length === 0 ? (
        <Card className="flex-1 p-8 flex flex-col items-center justify-center">
          <div className="max-w-2xl text-center space-y-6">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full inline-block">
              <MessageSquare className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Start a conversation about {selectedElder?.name || 'your elder'}'s health
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Try asking questions like:
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {exampleQueries.map((query, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(query)}
                  className="p-3 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                  <p className="text-sm text-gray-700 dark:text-gray-300">{query}</p>
                </button>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={'flex gap-3 ' + (message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                <div
                  className={
                    'max-w-[70%] rounded-lg p-4 ' +
                    (message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100')
                  }
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {message.chartData?.compliance && (
                    <div className="mt-4 p-3 bg-white dark:bg-gray-900 rounded-lg">
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Compliance Data
                      </h4>
                      <ResponsiveContainer width="100%" height={150}>
                        <BarChart data={[
                          { name: 'Taken', value: message.chartData.compliance.takenDoses },
                          { name: 'Missed', value: message.chartData.compliance.missedDoses },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <Info className="h-3 w-3" />
                        <span>Sources: {message.sources.join(', ')}</span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {format(message.timestamp, 'h:mm a')}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-600 dark:text-gray-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </Card>
      )}

      <Card className="p-4 mt-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about health data..."
            disabled={loading || !selectedElder}
            className="flex-1"
          />
          <VoiceRecordButton
            onRecordingComplete={handleVoiceInput}
            disabled={loading || !selectedElder}
            variant="outline"
          />
          <Button type="submit" disabled={loading || !inputValue.trim() || !selectedElder}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
        {!selectedElder && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Please select an elder to start chatting
          </p>
        )}
      </Card>
    </div>
  );
}
