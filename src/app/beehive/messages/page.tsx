'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import MessageChat from '@/components/beehive/MessageChat';
import { getUnreadCount } from '@/lib/beehive/messaging';
import { Icons } from '@/lib/beehive/icons';

interface Conversation {
  id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_role: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  booking_id?: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [userId, setUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<'patient' | 'caregiver'>('patient');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(true);

  // Get conversation ID from URL if provided
  const conversationId = searchParams.get('conversation');
  const otherUserId = searchParams.get('user');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Get user ID from Supabase
        const { data: userData } = await supabase
          .from('users')
          .select('id, role')
          .eq('firebase_uid', firebaseUser.uid)
          .single();
        
        if (userData) {
          setUserId(userData.id);
          setUserRole(userData.role as 'patient' | 'caregiver');
          await loadConversations(userData.id);
          
          // Load unread count
          const unread = await getUnreadCount(userData.id);
          setTotalUnread(unread);
        }
        
        setLoading(false);
      } else {
        router.push('/beehive/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    // If a specific conversation is requested, select it
    if (otherUserId && conversations.length > 0) {
      const conversation = conversations.find(c => c.other_user_id === otherUserId);
      if (conversation) {
        setSelectedConversation(conversation);
      }
    }
  }, [otherUserId, conversations]);


  const loadConversations = async (userId: string) => {
    try {
      // Get all conversations for this user
      const { data: messages } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, email),
          receiver:users!messages_receiver_id_fkey(id, email)
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (!messages) return;

      // Group messages by conversation
      const conversationMap = new Map<string, Conversation>();
      
      for (const message of messages) {
        const otherUser = message.sender_id === userId ? message.receiver : message.sender;
        const otherUserId = message.sender_id === userId ? message.receiver_id : message.sender_id;
        
        if (!conversationMap.has(otherUserId)) {
          // Get user details
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', otherUserId)
            .single();
          
          let userName = otherUser?.email || 'Unknown User';
          
          // Try to get actual name from profile
          if (profile?.role === 'caregiver') {
            const { data: caregiverProfile } = await supabase
              .from('caregiver_profiles')
              .select('first_name, last_name')
              .eq('user_id', otherUserId)
              .single();
            
            if (caregiverProfile) {
              userName = `${caregiverProfile.first_name} ${caregiverProfile.last_name}`;
            }
          } else if (profile?.role === 'patient') {
            const { data: patientProfile } = await supabase
              .from('patient_profiles')
              .select('first_name, last_name')
              .eq('user_id', otherUserId)
              .single();
            
            if (patientProfile) {
              userName = `${patientProfile.first_name} ${patientProfile.last_name}`;
            }
          }
          
          conversationMap.set(otherUserId, {
            id: `conv-${otherUserId}`,
            other_user_id: otherUserId,
            other_user_name: userName,
            other_user_role: profile?.role || 'unknown',
            last_message: message.content,
            last_message_at: message.created_at,
            unread_count: !message.is_read && message.receiver_id === userId ? 1 : 0,
            booking_id: message.booking_id,
          });
        } else {
          // Update unread count
          const conv = conversationMap.get(otherUserId)!;
          if (!message.is_read && message.receiver_id === userId) {
            conv.unread_count++;
          }
        }
      }

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const startNewConversation = async (otherUserId: string, otherUserName: string) => {
    const newConv: Conversation = {
      id: `conv-${otherUserId}`,
      other_user_id: otherUserId,
      other_user_name: otherUserName,
      other_user_role: userRole === 'patient' ? 'caregiver' : 'patient',
      last_message: '',
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    };
    
    setConversations([newConv, ...conversations]);
    setSelectedConversation(newConv);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-elder-lg text-elder-text">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Icons.Message className="w-6 h-6 text-primary-600" />
              <h1 className="text-elder-xl font-bold text-elder-text">
                Messages
              </h1>
              {totalUnread > 0 && (
                <span className="ml-3 px-3 py-1 bg-red-500 text-white text-elder-sm rounded-full">
                  {totalUnread} unread
                </span>
              )}
            </div>
            <button
              onClick={() => router.push(userRole === 'patient' ? '/beehive/patient/dashboard' : '/beehive/caregiver/dashboard')}
              className="text-elder-base text-primary-600 hover:text-primary-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Notice Banner - Role Specific */}
      {showPrivacyNotice && (
        <div className={`${
          userRole === 'caregiver' ? 'bg-blue-50 border-b border-blue-200' : 'bg-green-50 border-b border-green-200'
        }`}>
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {userRole === 'caregiver' ? (
                  <Icons.Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <Icons.Lock className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className={`text-sm font-medium ${
                    userRole === 'caregiver' ? 'text-blue-900' : 'text-green-900'
                  }`}>
                    {userRole === 'caregiver' ? 'Communication Guidelines' : 'Your Privacy is Protected'}
                  </h3>
                  <ul className={`mt-1 text-xs space-y-0.5 ${
                    userRole === 'caregiver' ? 'text-blue-800' : 'text-green-800'
                  }`}>
                    {userRole === 'caregiver' ? (
                      <>
                        <li className="flex items-center gap-1">
                          <Icons.Check className="w-3 h-3" />
                          Focus on care needs and scheduling only
                        </li>
                        <li className="flex items-center gap-1">
                          <Icons.Block className="w-3 h-3" />
                          Never ask for SSN, financial, or estate information
                        </li>
                        <li className="flex items-center gap-1">
                          <Icons.Info className="w-3 h-3" />
                          Contact details shared automatically after booking
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-center gap-1">
                          <Icons.Shield className="w-3 h-3" />
                          Never share SSN, credit cards, or passwords
                        </li>
                        <li className="flex items-center gap-1">
                          <Icons.Lock className="w-3 h-3" />
                          Your contact info protected until booking confirmed
                        </li>
                        <li className="flex items-center gap-1">
                          <Icons.Warning className="w-3 h-3" />
                          Report any suspicious requests immediately
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
              <button
                onClick={() => setShowPrivacyNotice(false)}
                className={`p-1 rounded-full hover:bg-white/50 ${
                  userRole === 'caregiver' ? 'text-blue-600' : 'text-green-600'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-180px)]">
          {/* Conversations List */}
          <div className="lg:col-span-1 bg-white rounded-elder-lg shadow-elder border border-elder-border overflow-hidden">
            <div className="p-3 border-b border-gray-200">
              <h2 className="text-elder-lg font-semibold text-elder-text">
                Conversations
              </h2>
            </div>
            
            <div className="overflow-y-auto h-full">
              {conversations.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-elder-base text-elder-text-secondary">
                    No conversations yet
                  </p>
                  <p className="text-elder-sm text-elder-text-secondary mt-2">
                    {userRole === 'patient' 
                      ? 'Start by finding a caregiver'
                      : 'Patients will message you after viewing your profile'}
                  </p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`w-full px-3 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                      selectedConversation?.id === conversation.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-elder-base font-medium text-elder-text">
                        {conversation.other_user_name}
                      </h3>
                      <span className="text-elder-sm text-elder-text-secondary">
                        {formatTime(conversation.last_message_at)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-elder-sm text-elder-text-secondary truncate pr-2">
                        {conversation.last_message || 'No messages yet'}
                      </p>
                      {conversation.unread_count > 0 && (
                        <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded-full">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-elder-xs text-elder-text-secondary mt-1">
                      {conversation.other_user_role === 'caregiver' ? 'Caregiver' : 'Patient'}
                      {conversation.booking_id && ' • Booking'}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            {selectedConversation ? (
              <MessageChat
                currentUserId={userId}
                otherUserId={selectedConversation.other_user_id}
                otherUserName={selectedConversation.other_user_name}
                userRole={userRole}
                bookingId={selectedConversation.booking_id}
              />
            ) : (
              <div className="bg-white rounded-elder-lg shadow-elder border border-elder-border h-full flex items-center justify-center">
                <div className="text-center">
                  <Icons.Message className="w-24 h-24 text-gray-300 mb-4" />
                  <h3 className="text-elder-lg font-medium text-elder-text mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-elder-base text-elder-text-secondary">
                    Choose a conversation from the list to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}