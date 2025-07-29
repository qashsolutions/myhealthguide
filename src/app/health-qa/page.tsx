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
import { HealthQuestion, HealthAnswer } from '@/types';
import { ROUTES, DISCLAIMERS } from '@/lib/constants';

/**
 * Public Health Q&A page
 * No authentication required
 */
export default function HealthQAPage() {
  const router = useRouter();
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

  // Handle question submission
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    setIsAsking(true);
    setError(null);

    try {
      const response = await fetch('/api/health-qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        saveToHistory(result.data);
        setQuestion('');
      } else {
        setError(result.error || 'Unable to get answer. Please try again.');
      }
    } catch (error) {
      console.error('Health Q&A error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsAsking(false);
    }
  };

  // Example questions
  const exampleQuestions = [
    "What are the side effects of aspirin?",
    "Can I take vitamin D with calcium?",
    "What helps with high blood pressure?",
    "Is it safe to take ibuprofen daily?",
  ];

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Back button */}
      <Button
        variant="secondary"
        size="small"
        icon={<ArrowLeft className="h-5 w-5" />}
        onClick={() => router.push(ROUTES.DASHBOARD)}
        className="mb-6"
      >
        Back to Dashboard
      </Button>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-elder-2xl elder-tablet:text-elder-3xl font-bold text-elder-text mb-3">
          Ask Health Questions
        </h1>
        <p className="text-elder-lg text-elder-text-secondary">
          Get answers to your health and medication questions from our AI assistant.
        </p>
      </div>

      {/* Medical disclaimer */}
      <div className="bg-primary-50 border-2 border-primary-200 rounded-elder p-6 mb-8">
        <div className="flex gap-4">
          <AlertCircle className="h-6 w-6 text-primary-600 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-elder-lg font-semibold text-primary-900 mb-2">
              Important Information
            </h2>
            <p className="text-elder-base text-primary-800">
              {DISCLAIMERS.GENERAL}
            </p>
          </div>
        </div>
      </div>

      {/* Question form */}
      <form onSubmit={handleAskQuestion} className="mb-8">
        <div className="bg-white rounded-elder-lg shadow-elder border border-elder-border p-6">
          <label htmlFor="question" className="block text-elder-lg font-semibold mb-4">
            Your Question
          </label>
          
          <div className="space-y-4">
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Type your health or medication question here..."
              className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder 
                       focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20
                       resize-none"
              rows={4}
              disabled={isAsking}
            />

            {error && (
              <div className="p-4 bg-health-danger-bg border-2 border-health-danger rounded-elder">
                <p className="text-elder-base text-health-danger">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="large"
              icon={<Send className="h-5 w-5" />}
              loading={isAsking}
              disabled={isAsking || !question.trim()}
              fullWidth
            >
              {isAsking ? 'Getting Answer...' : 'Ask Question'}
            </Button>
          </div>
        </div>
      </form>

      {/* Example questions */}
      {recentAnswers.length === 0 && (
        <div className="mb-8">
          <h3 className="text-elder-lg font-semibold mb-4">
            Example Questions:
          </h3>
          <div className="grid grid-cols-1 elder-tablet:grid-cols-2 gap-3">
            {exampleQuestions.map((example, index) => (
              <button
                key={index}
                onClick={() => setQuestion(example)}
                className="text-left p-4 bg-elder-background-alt rounded-elder border-2 border-transparent
                         hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <p className="text-elder-base text-elder-text">{example}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent answers */}
      {recentAnswers.length > 0 && (
        <div>
          <h3 className="text-elder-lg font-semibold mb-4 flex items-center gap-2">
            <MessageCircle className="h-6 w-6" />
            Recent Questions
          </h3>
          <div className="space-y-4">
            {recentAnswers.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-elder-lg shadow-sm border border-elder-border p-6"
              >
                <h4 className="text-elder-base font-semibold mb-3 text-primary-700">
                  Q: {item.question}
                </h4>
                <div className="prose prose-elder max-w-none">
                  <div className="text-elder-base text-elder-text whitespace-pre-wrap">
                    {item.answer}
                  </div>
                </div>
                
                {/* Medication details if available */}
                {item.medicationDetails && (
                  <div className="mt-4 p-4 bg-elder-background-alt rounded-elder">
                    <h5 className="text-elder-sm font-semibold mb-2">Medication Information:</h5>
                    <dl className="space-y-1 text-elder-sm">
                      {item.medicationDetails.genericName && (
                        <div>
                          <dt className="inline font-medium">Generic Name:</dt>
                          <dd className="inline ml-2">{item.medicationDetails.genericName}</dd>
                        </div>
                      )}
                      {item.medicationDetails.brandNames && item.medicationDetails.brandNames.length > 0 && (
                        <div>
                          <dt className="inline font-medium">Brand Names:</dt>
                          <dd className="inline ml-2">{item.medicationDetails.brandNames.join(', ')}</dd>
                        </div>
                      )}
                      {item.medicationDetails.pronunciation && (
                        <div>
                          <dt className="inline font-medium">Pronunciation:</dt>
                          <dd className="inline ml-2">{item.medicationDetails.pronunciation}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
                
                <p className="text-elder-sm text-elder-text-secondary mt-4">
                  {new Date(item.answeredAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}