'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Send, 
  AlertCircle, 
  ArrowLeft,
  Loader2,
  Heart,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth, withAuth } from '@/hooks/useAuth';
import { HealthQuestion, HealthAnswer } from '@/types';
import { ROUTES, DISCLAIMERS } from '@/lib/constants';

/**
 * Health Q&A page with voice input/output
 * AI-powered health questions for elderly users
 */
function HealthQAPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentAnswers, setRecentAnswers] = useState<HealthAnswer[]>([]);


  // Load recent answers from session storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('healthQAHistory');
      if (stored) {
        try {
          setRecentAnswers(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to load history:', e);
        }
      }
    }
  }, []);

  // Save answers to session storage
  const saveToHistory = (answer: HealthAnswer) => {
    const updated = [answer, ...recentAnswers].slice(0, 5); // Keep last 5
    setRecentAnswers(updated);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('healthQAHistory', JSON.stringify(updated));
    }
  };


  // Submit question
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setError('Please enter a question');
      return;
    }

    if (trimmedQuestion.length < 5) {
      setError('Please enter a more detailed question');
      return;
    }

    setError(null);
    setIsAsking(true);

    try {
      const response = await fetch('/api/health-qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          question: trimmedQuestion,
          context: `User is ${user?.name || 'an elderly person'}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }

      // Save to history
      saveToHistory(data.data);
      
      // Clear question
      setQuestion('');
    } catch (err) {
      console.error('Health Q&A error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get answer');
    } finally {
      setIsAsking(false);
    }
  };

  // Common health topics for quick access
  const commonTopics = [
    "Side effects of blood pressure medication",
    "Safe pain relief for arthritis",
    "Foods to avoid with diabetes",
    "How to improve sleep quality",
    "Managing medication schedules",
  ];

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Back button */}
      <button
        onClick={() => router.push(ROUTES.DASHBOARD)}
        className="inline-flex items-center gap-2 text-elder-base text-primary-600 hover:text-primary-700 mb-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Dashboard
      </button>

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary-100 rounded-full">
            <MessageCircle className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-elder-2xl elder-tablet:text-elder-3xl font-bold text-elder-text">
              Health Questions
            </h1>
            <p className="text-elder-lg text-elder-text-secondary">
              Ask any health question and get clear, simple answers
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-primary-50 border-2 border-primary-200 rounded-elder p-4 mb-8">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-primary-600 flex-shrink-0 mt-1" />
          <p className="text-elder-base text-primary-800">
            {DISCLAIMERS.AI_LIMITATIONS}
          </p>
        </div>
      </div>

      {/* Question Input */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="bg-white rounded-elder-lg shadow-sm p-6">
          <label htmlFor="question" className="block text-elder-lg font-medium text-elder-text mb-4">
            What's your health question?
          </label>
          
          <div className="relative">
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Type your question here..."
              className="w-full px-4 py-3 border-2 border-elder-border rounded-elder text-elder-base leading-elder resize-none focus:outline-none focus:ring-4 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              disabled={isAsking}
            />
          </div>


          {/* Error message */}
          {error && (
            <div className="mt-4 p-4 bg-health-danger-bg border-2 border-health-danger rounded-elder">
              <p className="text-elder-base text-health-danger">{error}</p>
            </div>
          )}

          {/* Submit button */}
          <div className="mt-6">
            <Button
              type="submit"
              variant="primary"
              size="large"
              loading={isAsking}
              disabled={!question.trim()}
              icon={<Send className="h-5 w-5" />}
              className="w-full elder-tablet:w-auto"
            >
              Get Answer
            </Button>
          </div>
        </div>
      </form>

      {/* Common Topics */}
      {recentAnswers.length === 0 && (
        <div className="mb-8">
          <h2 className="text-elder-lg font-semibold text-elder-text mb-4">
            Common Health Topics
          </h2>
          <div className="grid gap-3">
            {commonTopics.map((topic, index) => (
              <button
                key={index}
                onClick={() => setQuestion(topic)}
                className="text-left p-4 bg-white hover:bg-gray-50 rounded-elder border-2 border-elder-border hover:border-primary-300 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500"
              >
                <p className="text-elder-base text-elder-text">{topic}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Answers */}
      {recentAnswers.length > 0 && (
        <div>
          <h2 className="text-elder-lg font-semibold text-elder-text mb-4">
            Recent Questions
          </h2>
          <div className="space-y-4">
            {recentAnswers.map((answer) => (
              <div
                key={answer.id}
                className="bg-white rounded-elder-lg shadow-sm p-6"
              >
                <div className="mb-4">
                  <h3 className="text-elder-base font-semibold text-elder-text mb-2">
                    {answer.question}
                  </h3>
                  <p className="text-elder-sm text-elder-text-secondary">
                    Asked {new Date(answer.answeredAt).toLocaleString()}
                  </p>
                </div>
                
                <div className="prose prose-lg max-w-none">
                  {/* Parse and render the answer with proper formatting */}
                  {(() => {
                    // First check if the answer looks like raw JSON
                    if (answer.answer.trim().startsWith('{') || answer.answer.includes('```')) {
                      return (
                        <p className="text-elder-base text-elder-text leading-elder">
                          I have information about this topic, but I'm having trouble formatting it properly. 
                          Please try asking your question again or consult your healthcare provider.
                        </p>
                      );
                    }
                    
                    // Otherwise render normally
                    return answer.answer.split('\n').map((paragraph, idx) => {
                      // Check if it's a heading (starts with ##)
                      if (paragraph.startsWith('## ')) {
                        const heading = paragraph.replace('## ', '');
                        // Summary gets larger font
                        if (heading === 'Summary') {
                          return (
                            <h3 key={idx} className="text-elder-xl font-bold text-elder-text mt-4 mb-3">
                              {heading}
                            </h3>
                          );
                        }
                        // Other headings
                        return (
                          <h3 key={idx} className="text-elder-lg font-semibold text-elder-text mt-4 mb-2">
                            {heading}
                          </h3>
                        );
                      }
                      // Skip empty lines
                      if (paragraph.trim() === '') {
                        return null;
                      }
                      // Regular paragraph
                      return (
                        <p key={idx} className="text-elder-base text-elder-text leading-elder mb-3">
                          {paragraph}
                        </p>
                      );
                    });
                  })()}
                </div>
                
                {answer.medicationDetails && (
                  <div className="mt-6">
                    <h3 className="text-elder-lg font-semibold text-elder-text mb-4">
                      Medication Details
                    </h3>
                    <div className="space-y-3 bg-elder-background-alt p-4 rounded-elder">
                    {answer.medicationDetails.brandNames && answer.medicationDetails.brandNames.length > 0 && (
                      <div>
                        <span className="text-elder-base font-semibold text-elder-text">Brand Names: </span>
                        <span className="text-elder-base text-elder-text-secondary">
                          {answer.medicationDetails.brandNames.join(', ')}
                        </span>
                      </div>
                    )}
                    
                    {answer.medicationDetails.genericName && (
                      <div>
                        <span className="text-elder-base font-semibold text-elder-text">Generic Name: </span>
                        <span className="text-elder-base text-elder-text-secondary">
                          {answer.medicationDetails.genericName}
                        </span>
                      </div>
                    )}
                    
                    {answer.medicationDetails.pronunciation && (
                      <div>
                        <span className="text-elder-base font-semibold text-elder-text">Pronunciation: </span>
                        <span className="text-elder-base text-elder-text-secondary">
                          {answer.medicationDetails.pronunciation}
                        </span>
                      </div>
                    )}
                    
                    {answer.medicationDetails.drugClasses && answer.medicationDetails.drugClasses.length > 0 && (
                      <div>
                        <span className="text-elder-base font-semibold text-elder-text">Drug Classes: </span>
                        <span className="text-elder-base text-elder-text-secondary">
                          {answer.medicationDetails.drugClasses.join(', ')}
                        </span>
                      </div>
                    )}
                    
                    {answer.medicationDetails.availability && (
                      <div>
                        <span className="text-elder-base font-semibold text-elder-text">Availability: </span>
                        <span className="text-elder-base text-elder-text-secondary">
                          {answer.medicationDetails.availability}
                        </span>
                      </div>
                    )}
                    
                    {answer.medicationDetails.howUsed && (
                      <div>
                        <span className="text-elder-base font-semibold text-elder-text">How is it used? </span>
                        <span className="text-elder-base text-elder-text-secondary">
                          {answer.medicationDetails.howUsed}
                        </span>
                      </div>
                    )}
                    </div>
                  </div>
                )}
                
                <p className="mt-4 text-elder-sm text-elder-text-secondary italic">
                  {answer.disclaimer}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-12 p-6 bg-elder-background-alt rounded-elder-lg">
        <div className="flex items-center gap-3 mb-4">
          <Heart className="h-6 w-6 text-health-danger" />
          <h2 className="text-elder-lg font-semibold">
            Getting the Most from Health Q&A
          </h2>
        </div>
        <ul className="space-y-2">
          <li className="flex items-start gap-3">
            <span className="text-primary-600">•</span>
            <p className="text-elder-base text-elder-text-secondary">
              Be specific about your symptoms or concerns
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary-600">•</span>
            <p className="text-elder-base text-elder-text-secondary">
              Include relevant details like age or existing conditions
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary-600">•</span>
            <p className="text-elder-base text-elder-text-secondary">
              Always verify AI answers with your healthcare provider
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary-600">•</span>
            <p className="text-elder-base text-elder-text-secondary">
              For emergencies, call 911 immediately
            </p>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default withAuth(HealthQAPage, { requireDisclaimer: true });