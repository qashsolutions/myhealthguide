'use client';

import { useState } from 'react';
import { filterMessageContent } from '@/lib/beehive/privacy-filter';
import MessageValidator from '@/components/beehive/MessageValidator';
import { Icons } from '@/lib/beehive/icons';

export default function TestPrivacyPage() {
  const [testMessage, setTestMessage] = useState('');
  const [senderRole, setSenderRole] = useState<'patient' | 'caregiver'>('patient');
  const [results, setResults] = useState<any>(null);

  const testMessages = {
    blocked: [
      "What's your social security number?",
      "My SSN is 123-45-6789",
      "Send me your credit card number",
      "My card is 4532 1234 5678 9012",
      "How much money do you have in your bank?",
      "Tell me about your will and inheritance",
      "Who's your beneficiary?",
      "What's your password?",
      "Can we meet outside the app?",
      "Let's meet privately somewhere",
    ],
    filtered: [
      "Call me at 555-123-4567",
      "My email is test@example.com",
      "I live at 123 Main Street",
      "Do you live alone?",
      "Are you married or single?",
      "Tell me about your family",
      "Send me a photo of yourself",
      "What's your phone number?",
      "Can I have your WhatsApp?",
    ],
    clean: [
      "I need help with meal preparation",
      "Can you assist with mobility?",
      "I have diabetes and need medication reminders",
      "What are your available hours?",
      "I prefer morning care sessions",
      "Thank you for your help yesterday",
    ],
  };

  const handleTest = () => {
    const result = filterMessageContent(testMessage, senderRole);
    setResults(result);
  };

  const handleQuickTest = (message: string) => {
    setTestMessage(message);
    const result = filterMessageContent(message, senderRole);
    setResults(result);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Icons.Shield className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold">Privacy Filter Testing</h1>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Message Filtering</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Sender Role</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="patient"
                  checked={senderRole === 'patient'}
                  onChange={(e) => setSenderRole(e.target.value as 'patient')}
                  className="mr-2"
                />
                Patient/Elder
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="caregiver"
                  checked={senderRole === 'caregiver'}
                  onChange={(e) => setSenderRole(e.target.value as 'caregiver')}
                  className="mr-2"
                />
                Caregiver
              </label>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Test Message</label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full p-3 border rounded-lg"
              rows={4}
              placeholder="Enter a message to test..."
            />
            {/* Real-time validation feedback */}
            <MessageValidator
              message={testMessage}
              senderRole={senderRole}
              showInline={true}
            />
          </div>

          <button
            onClick={handleTest}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Test Message
          </button>
        </div>

        {/* Quick Test Buttons */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Quick Tests</h2>
          
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Icons.Block className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-medium text-red-600">Blocked Messages</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {testMessages.blocked.map((msg, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickTest(msg)}
                  className="text-left p-3 bg-red-50 hover:bg-red-100 rounded border border-red-200"
                >
                  "{msg}"
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Icons.Warning className="w-5 h-5 text-yellow-600" />
              <h3 className="text-lg font-medium text-yellow-600">Filtered Messages</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {testMessages.filtered.map((msg, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickTest(msg)}
                  className="text-left p-3 bg-yellow-50 hover:bg-yellow-100 rounded border border-yellow-200"
                >
                  "{msg}"
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Icons.Check className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-medium text-green-600">Clean Messages</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {testMessages.clean.map((msg, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickTest(msg)}
                  className="text-left p-3 bg-green-50 hover:bg-green-100 rounded border border-green-200"
                >
                  "{msg}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Filter Results</h2>
            
            <div className="space-y-4">
              <div>
                <strong>Status:</strong>{' '}
                <span className={`flex items-center gap-2 font-semibold ${
                  results.blocked ? 'text-red-600' : 
                  results.filtered ? 'text-yellow-600' : 
                  'text-green-600'
                }`}>
                  {results.blocked ? (
                    <><Icons.Block className="w-5 h-5" /> BLOCKED</>
                  ) : results.filtered ? (
                    <><Icons.Warning className="w-5 h-5" /> FILTERED</>
                  ) : (
                    <><Icons.Check className="w-5 h-5" /> CLEAN</>
                  )}
                </span>
              </div>

              {results.blocked && (
                <div className="p-4 bg-red-50 border border-red-200 rounded">
                  <strong className="text-red-800">Block Reason:</strong>
                  <p className="text-red-700 mt-1">{results.blockReason}</p>
                </div>
              )}

              <div>
                <strong>Original Message:</strong>
                <p className="p-3 bg-gray-50 rounded mt-1">{testMessage}</p>
              </div>

              <div>
                <strong>Filtered Message:</strong>
                <p className="p-3 bg-gray-50 rounded mt-1">{results.content}</p>
              </div>

              {results.warnings && results.warnings.length > 0 && (
                <div>
                  <strong>Warnings:</strong>
                  <ul className="mt-1 space-y-1">
                    {results.warnings.map((warning: string, idx: number) => (
                      <li key={idx} className="p-2 bg-yellow-50 rounded text-yellow-800">
                        <Icons.Warning className="w-4 h-4 inline mr-1" />
                      {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Privacy Protection Info */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icons.Privacy className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Privacy Protection Features</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-start">
              <Icons.Lock className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <strong>Bidirectional Protection:</strong> Blocks inappropriate requests from BOTH caregivers and patients/elders
              </div>
            </div>
            <div className="flex items-start">
              <Icons.Block className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <strong>Completely Blocked:</strong> SSN, credit cards, bank info, passwords, estate/will questions, meeting outside platform
              </div>
            </div>
            <div className="flex items-start">
              <Icons.Warning className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <strong>Filtered/Warned:</strong> Phone numbers, emails, addresses, personal family questions, photo requests
              </div>
            </div>
            <div className="flex items-start">
              <Icons.Chart className="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <strong>Audit Logging:</strong> All blocked attempts are logged for security monitoring
              </div>
            </div>
            <div className="flex items-start">
              <Icons.Handshake className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <strong>Trust Building:</strong> Contact info shared automatically through booking system when appropriate
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}