'use client';

import { useState, useEffect, useRef } from 'react';
import {
  sendMessage,
  getConversation,
  generateSuggestions,
  getConversationGuidance,
  subscribeToMessages,
  analyzeConversationSentiment,
  Message,
  MessageSuggestion,
} from '@/lib/beehive/messaging';

interface MessageChatProps {
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  userRole: 'patient' | 'caregiver';
  bookingId?: string;
}

export default function MessageChat({
  currentUserId,
  otherUserId,
  otherUserName,
  userRole,
  bookingId,
}: MessageChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [suggestions, setSuggestions] = useState<MessageSuggestion[]>([]);
  const [guidance, setGuidance] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [typing, setTyping] = useState(false);
  const [autoCompleteOptions, setAutoCompleteOptions] = useState<string[]>([]);
  const [selectedAutoComplete, setSelectedAutoComplete] = useState(-1);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Common auto-complete phrases for elder care
  const commonPhrases = {
    patient: [
      "What times are you available",
      "Do you have experience with",
      "Can you help with medication",
      "How much do you charge",
      "Do you speak",
      "Can we schedule a meeting",
      "What areas do you serve",
      "Are you comfortable with",
    ],
    caregiver: [
      "I'm available on",
      "I have experience with",
      "I can help with",
      "My hourly rate is",
      "I speak",
      "I'd be happy to",
      "I can provide references",
      "I'm certified in",
    ],
  };

  useEffect(() => {
    loadMessages();
    
    // Set up real-time subscription
    const subscription = subscribeToMessages(currentUserId, (newMsg) => {
      setMessages((prev) => [...prev, newMsg]);
      scrollToBottom();
      
      // Update suggestions when new message arrives
      generateNewSuggestions([...messages, newMsg]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUserId, otherUserId, bookingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-complete logic
  useEffect(() => {
    if (newMessage.length > 2) {
      const lastWord = newMessage.split(' ').pop()?.toLowerCase() || '';
      const currentPhrase = newMessage.toLowerCase();
      
      // Find matching phrases
      const matches = commonPhrases[userRole].filter(phrase => 
        phrase.toLowerCase().startsWith(currentPhrase) ||
        phrase.toLowerCase().includes(lastWord)
      );
      
      setAutoCompleteOptions(matches.slice(0, 3));
    } else {
      setAutoCompleteOptions([]);
    }
  }, [newMessage, userRole]);

  const loadMessages = async () => {
    setLoading(true);
    const history = await getConversation(currentUserId, otherUserId, bookingId);
    setMessages(history);
    
    // Generate initial suggestions and guidance
    await generateNewSuggestions(history);
    const newGuidance = await getConversationGuidance(history, userRole);
    setGuidance(newGuidance);
    
    // Check sentiment for safety
    if (history.length > 5) {
      const sentiment = await analyzeConversationSentiment(history);
      if (sentiment.shouldEscalate) {
        console.warn('Conversation flagged for review:', sentiment);
      }
    }
    
    setLoading(false);
  };

  const generateNewSuggestions = async (messageHistory: Message[]) => {
    const newSuggestions = await generateSuggestions(messageHistory, userRole);
    setSuggestions(newSuggestions);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');
    setAutoCompleteOptions([]);

    // Optimistically add message to UI
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      receiver_id: otherUserId,
      content: messageContent,
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, tempMessage]);

    const result = await sendMessage(
      currentUserId,
      otherUserId,
      messageContent,
      bookingId
    );

    if (result.success && result.message) {
      // Replace temp message with real one
      setMessages((prev) => 
        prev.map(m => m.id === tempMessage.id ? result.message! : m)
      );
      
      // Generate new suggestions
      await generateNewSuggestions([...messages, result.message]);
      
      // Update guidance
      const newGuidance = await getConversationGuidance(
        [...messages, result.message],
        userRole
      );
      setGuidance(newGuidance);
    } else {
      // Remove temp message on error
      setMessages((prev) => prev.filter(m => m.id !== tempMessage.id));
      alert(result.error || 'Failed to send message');
    }

    setSending(false);
  };

  const handleSuggestionClick = (suggestion: MessageSuggestion) => {
    setNewMessage(suggestion.text);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleAutoCompleteSelect = (option: string) => {
    setNewMessage(option);
    setAutoCompleteOptions([]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (autoCompleteOptions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedAutoComplete((prev) => 
          prev < autoCompleteOptions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedAutoComplete((prev) => 
          prev > 0 ? prev - 1 : autoCompleteOptions.length - 1
        );
      } else if (e.key === 'Tab' || (e.key === 'Enter' && selectedAutoComplete >= 0)) {
        e.preventDefault();
        handleAutoCompleteSelect(autoCompleteOptions[selectedAutoComplete]);
        setSelectedAutoComplete(-1);
      } else if (e.key === 'Escape') {
        setAutoCompleteOptions([]);
        setSelectedAutoComplete(-1);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-elder-base text-elder-text-secondary">
          Loading conversation...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-elder-lg shadow-elder border border-elder-border">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-elder-lg font-semibold text-elder-text">
              {otherUserName}
            </h3>
            {guidance && (
              <p className="text-elder-sm text-elder-text-secondary mt-1">
                💡 {guidance}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="text-elder-sm text-primary-600 hover:text-primary-700"
          >
            {showSuggestions ? 'Hide' : 'Show'} Suggestions
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-elder-base text-elder-text-secondary mb-4">
              No messages yet. Start the conversation!
            </p>
            {userRole === 'patient' && (
              <p className="text-elder-sm text-elder-text-secondary">
                Ask about their experience, availability, and services.
              </p>
            )}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_id === currentUserId ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] px-4 py-3 rounded-elder-lg ${
                  message.sender_id === currentUserId
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-elder-text'
                }`}
              >
                <p className="text-elder-base">{message.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.sender_id === currentUserId
                      ? 'text-primary-100'
                      : 'text-elder-text-secondary'
                  }`}
                >
                  {formatTime(message.created_at)}
                  {message.is_read && message.sender_id === currentUserId && ' ✓'}
                  {message.metadata?.filtered && ' (filtered)'}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="text-elder-sm text-elder-text-secondary mb-2">
            Suggested messages:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-2 bg-blue-50 text-blue-700 text-elder-sm rounded-full hover:bg-blue-100 transition-colors"
              >
                {suggestion.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="relative">
          {/* Auto-complete dropdown */}
          {autoCompleteOptions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-elder shadow-lg">
              {autoCompleteOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAutoCompleteSelect(option)}
                  className={`w-full px-4 py-2 text-left text-elder-base hover:bg-gray-50 ${
                    index === selectedAutoComplete ? 'bg-primary-50 text-primary-700' : ''
                  }`}
                >
                  {option}
                  <span className="text-elder-sm text-elder-text-secondary ml-2">
                    (Tab to select)
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end space-x-3">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Type your message... ${autoCompleteOptions.length > 0 ? '(Tab for suggestions)' : ''}`}
              className="flex-1 px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none resize-none"
              rows={2}
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="px-6 py-3 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-elder-xs text-elder-text-secondary">
              Press Enter to send, Shift+Enter for new line
            </p>
            {typing && (
              <p className="text-elder-xs text-elder-text-secondary animate-pulse">
                {otherUserName} is typing...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}