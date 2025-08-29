'use client';

import { useState } from 'react';
import Image from 'next/image';
import { 
  Shield, 
  AlertTriangle, 
  Lock, 
  Eye, 
  Search, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  UserX,
  Brain,
  RefreshCw,
  Phone,
  FileText,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

export default function BeehiveLandingPage() {
  const [expandedFear, setExpandedFear] = useState<number | null>(null);
  const [selectedScreeningLevel, setSelectedScreeningLevel] = useState(1);

  const fears = [
    {
      id: 1,
      title: "What if they have a violent past?",
      icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
      description: "You Google their name and find nothing. But what if they've hurt someone before? What if they lose their temper with your confused father who keeps asking the same question?",
      stat: "70% of caregivers rejected in our screening",
      color: "border-red-200 bg-red-50"
    },
    {
      id: 2,
      title: "What if they're a criminal?",
      icon: <UserX className="w-6 h-6 text-red-600" />,
      description: "Background checks miss things. Name changes. Sealed records. Crimes in other states. What if they've done time for assault, theft, or worse?",
      stat: "Standard checks only cover 7 years in 1 state",
      color: "border-red-200 bg-red-50"
    },
    {
      id: 3,
      title: "What if they snap under pressure?",
      icon: <Brain className="w-6 h-6 text-orange-600" />,
      description: "Your mom with dementia might scream, hit, say terrible things. What if the caregiver can't handle it? What if they push back, restrain too hard, or retaliate?",
      stat: "Caregiver violence often triggered by care recipient aggression",
      color: "border-orange-200 bg-orange-50"
    },
    {
      id: 4,
      title: "What if they're using drugs?",
      icon: <AlertCircle className="w-6 h-6 text-red-600" />,
      description: "Prescription pills go missing. They seem drowsy, agitated, or 'off.' What if they're stealing medications? What if they're high while caring for your parent?",
      stat: "15% of healthcare workers have substance abuse issues",
      color: "border-red-200 bg-red-50"
    },
    {
      id: 5,
      title: "What if they're stealing?",
      icon: <Lock className="w-6 h-6 text-yellow-600" />,
      description: "Jewelry disappears. Cash goes missing. Credit cards get mysterious charges. Your parent with dementia can't tell you what happened.",
      stat: "$36 billion stolen from seniors annually",
      color: "border-yellow-200 bg-yellow-50"
    }
  ];

  const screeningLevels = [
    {
      level: 1,
      title: "County Criminal Search",
      description: "Most platforms stop here",
      details: [
        "Current county only",
        "7 years history",
        "Misses 60% of crimes",
        "No federal crimes",
        "No other states"
      ],
      verdict: "INADEQUATE",
      verdictColor: "text-red-600"
    },
    {
      level: 2,
      title: "Multi-State + Federal",
      description: "What we require minimum",
      details: [
        "All 50 states coverage",
        "Federal crime database",
        "Sex offender registry",
        "Terrorist watchlist",
        "Healthcare exclusions"
      ],
      verdict: "BASELINE",
      verdictColor: "text-yellow-600"
    },
    {
      level: 3,
      title: "Deep Background + Psychometric",
      description: "Our actual standard",
      details: [
        "Everything in Level 2",
        "Social media analysis",
        "Reference verification",
        "Psychometric assessment",
        "Scenario-based testing"
      ],
      verdict: "PROTECTED",
      verdictColor: "text-green-600"
    }
  ];

  const psychometricTests = [
    {
      scenario: "Care recipient spits at you and calls you racial slurs",
      redFlag: "Firmly grab their wrists to make them stop",
      safe: "Step back, stay calm, give them space"
    },
    {
      scenario: "You've explained something 10 times. Care recipient asks again.",
      redFlag: "Raise voice to make them understand",
      safe: "Patiently explain again with a smile"
    },
    {
      scenario: "Care recipient tries to get up but is fall risk",
      redFlag: "Physically hold them in chair",
      safe: "Redirect with activities, call for help"
    },
    {
      scenario: "Care recipient scratches you while you're helping them dress",
      redFlag: "Pull their hand away forcefully",
      safe: "Pause, assess why they're distressed"
    }
  ];

  const comparisonData = [
    {
      feature: "Criminal Background Check",
      beehive: "50-state + Federal + International",
      others: "Single county (7 years)"
    },
    {
      feature: "Psychometric Testing",
      beehive: "120-question assessment + scenarios",
      others: "None"
    },
    {
      feature: "Reference Verification",
      beehive: "3 professional + 2 personal (verified)",
      others: "Self-reported only"
    },
    {
      feature: "Ongoing Monitoring",
      beehive: "Daily criminal database updates",
      others: "One-time check"
    },
    {
      feature: "Drug Testing",
      beehive: "Initial + random testing",
      others: "None required"
    },
    {
      feature: "Rejection Rate",
      beehive: "70% rejected",
      others: "< 5% rejected"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Image */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-800 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-12">
            AI Matching of Caregivers and Care Seekers
          </h1>
          
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left: Image */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="/caregiver_garden.png"
                alt="Professional caregiver with elderly person in garden"
                width={600}
                height={400}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
            
            {/* Right: Safety Card */}
            <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700">
              <div className="flex items-center mb-6">
                <Shield className="w-16 h-16 text-yellow-400 mr-4 flex-shrink-0" />
                <h2 className="text-3xl font-bold">
                  Your Parent's Safety Is Not Negotiable
                </h2>
              </div>
              <p className="text-xl text-gray-300 mb-6">
                We reject 70% of caregiver applicants. Here's exactly how we protect your loved ones from the dangers other platforms ignore.
              </p>
              <div className="space-y-4">
                <div className="flex items-center text-gray-300">
                  <CheckCircle className="w-6 h-6 text-green-400 mr-3 flex-shrink-0" />
                  <span>3-Level Criminal Background Screening</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <CheckCircle className="w-6 h-6 text-green-400 mr-3 flex-shrink-0" />
                  <span>Psychometric Safety Assessment</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <CheckCircle className="w-6 h-6 text-green-400 mr-3 flex-shrink-0" />
                  <span>Continuous Monitoring & Alerts</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <CheckCircle className="w-6 h-6 text-green-400 mr-3 flex-shrink-0" />
                  <span>24/7 Emergency Response Protocol</span>
                </div>
              </div>
              <div className="mt-8 flex gap-4">
                <button 
                  className="flex-1 px-6 py-3 bg-yellow-400 text-gray-900 rounded-lg font-semibold hover:bg-yellow-300 transition-colors cursor-not-allowed opacity-75"
                  disabled
                >
                  Find Safe Caregivers
                </button>
                <button 
                  className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors border border-gray-600 cursor-not-allowed opacity-75"
                  disabled
                >
                  Apply as Caregiver
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fears Section with Image */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              The Nightmares That Keep You Awake
            </h2>
            <p className="text-xl text-gray-600">
              We know exactly what you're afraid of. Because we are too.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Image */}
            <div className="relative rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="/caregiver_home.png"
                alt="Caregiver providing care at home"
                width={600}
                height={600}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Right: Fear Cards (Vertical) */}
            <div className="space-y-4">
              {fears.map((fear) => (
                <div
                  key={fear.id}
                  className={`border-2 rounded-2xl p-6 transition-all cursor-pointer ${fear.color} ${
                    expandedFear === fear.id ? 'shadow-lg' : 'hover:shadow-md'
                  }`}
                  onClick={() => setExpandedFear(expandedFear === fear.id ? null : fear.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {fear.icon}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {fear.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{fear.stat}</p>
                      </div>
                    </div>
                    <ChevronDown 
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        expandedFear === fear.id ? 'transform rotate-180' : ''
                      }`}
                    />
                  </div>
                  
                  {expandedFear === fear.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-gray-700">{fear.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3-Level Screening */}
      <section className="py-16 px-4 bg-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why 70% of Caregivers Fail Our Screening
            </h2>
            <p className="text-xl text-gray-600">
              Click each level to see what others miss
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              {screeningLevels.map((level) => (
                <button
                  key={level.level}
                  onClick={() => setSelectedScreeningLevel(level.level)}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    selectedScreeningLevel === level.level
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-lg font-semibold">Level {level.level}</div>
                  <div className="text-sm text-gray-600">{level.title}</div>
                </button>
              ))}
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-2">
                {screeningLevels[selectedScreeningLevel - 1].title}
              </h3>
              <p className="text-gray-600 mb-4">
                {screeningLevels[selectedScreeningLevel - 1].description}
              </p>
              <ul className="space-y-2">
                {screeningLevels[selectedScreeningLevel - 1].details.map((detail, index) => (
                  <li key={index} className="flex items-start">
                    {selectedScreeningLevel === 1 ? (
                      <XCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                    ) : selectedScreeningLevel === 2 ? (
                      <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    )}
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 text-center">
                <span className={`text-2xl font-bold ${screeningLevels[selectedScreeningLevel - 1].verdictColor}`}>
                  {screeningLevels[selectedScreeningLevel - 1].verdict}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Psychometric Testing */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              The Questions That Reveal True Character
            </h2>
            <p className="text-xl text-gray-600">
              Dynamic AI-powered assessment - no two caregivers see the same questions
            </p>
            <p className="text-lg text-gray-500 mt-2">
              Our system generates unique scenarios based on each caregiver's responses, making it impossible to prepare or cheat
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {psychometricTests.map((test, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-start mb-4">
                  <div className="bg-purple-100 rounded-full p-2 mr-3">
                    {index === 0 ? (
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : index === 1 ? (
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : index === 2 ? (
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                      </svg>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 flex-1">
                    Scenario: {test.scenario}
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-red-900">Red Flag Response:</span>
                      <p className="text-red-800">{test.redFlag}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-green-900">Safe Response:</span>
                      <p className="text-green-800">{test.safe}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rejection Stats */}
      <section className="py-16 px-4 bg-gradient-to-b from-red-600 to-red-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            We Accept Less Than 30% of Applicants
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur rounded-lg p-6">
              <div className="text-3xl font-bold">35%</div>
              <div className="text-sm mt-2">Criminal History</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-6">
              <div className="text-3xl font-bold">20%</div>
              <div className="text-sm mt-2">Failed Psych Test</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-6">
              <div className="text-3xl font-bold">10%</div>
              <div className="text-sm mt-2">Bad References</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-6">
              <div className="text-3xl font-bold">5%</div>
              <div className="text-sm mt-2">Drug Test</div>
            </div>
          </div>
          <p className="text-xl mt-8 text-white/90">
            Other platforms accept almost everyone. We don't.
          </p>
        </div>
      </section>

      {/* Continuous Monitoring */}
      <section className="py-16 px-4 bg-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Protection Doesn't Stop After Hiring
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <RefreshCw className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Daily Database Checks</h3>
              <p className="text-gray-600">
                New arrests, warrants, and court records checked every 24 hours across all 50 states
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <Eye className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Behavior Monitoring</h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Complaint patterns</li>
                <li>• Tardiness/absence</li>
                <li>• Care recipient fear indicators</li>
                <li>• Family discomfort reports</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <AlertTriangle className="w-12 h-12 text-red-600 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Zero Tolerance Triggers</h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Any police contact</li>
                <li>• Any injury to care recipient</li>
                <li>• Any aggressive language</li>
                <li>• Any boundary violation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>


      {/* Pricing Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Transparent Pricing, No Hidden Fees
            </h2>
            <p className="text-xl text-gray-600">
              Simple, fair pricing for everyone
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Caregivers Pricing */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border-2 border-blue-200">
              <div className="flex items-center mb-6">
                <div className="bg-blue-600 rounded-full p-3 mr-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">For Caregivers</h3>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Keep 100% of Your Revenue</p>
                    <p className="text-sm text-gray-600">No commission fees, ever</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Only Pay for Background Checks</p>
                    <p className="text-sm text-gray-600">One-time fee when you join</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Optional Premium Listing</p>
                    <p className="text-sm text-gray-600">Stand out with priority placement</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-3xl font-bold text-gray-900">$0</span>
                  <span className="text-gray-500">/month base fee</span>
                </div>
                <p className="text-sm text-gray-600">
                  Pay only for verification services<br/>
                  Optional premium features available
                </p>
              </div>
            </div>

            {/* Care Seekers Pricing */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 border-2 border-purple-200">
              <div className="flex items-center mb-6">
                <div className="bg-purple-600 rounded-full p-3 mr-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">For Care Seekers</h3>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">One Flat Fee Per Month</p>
                    <p className="text-sm text-gray-600">Unlimited caregiver connections</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Quarterly Background Checks</p>
                    <p className="text-sm text-gray-600">All caregivers re-verified every 3 months</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Full Platform Access</p>
                    <p className="text-sm text-gray-600">Messaging, scheduling, monitoring included</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-3xl font-bold text-gray-900">$25</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="text-sm text-gray-600">
                  Cancel anytime<br/>
                  No setup fees
                </p>
              </div>
            </div>
          </div>

          {/* Why This Model Works */}
          <div className="mt-12 bg-gray-50 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Why Our Pricing Model Works</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-green-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold mb-2">No Middleman Fees</h4>
                <p className="text-sm text-gray-600">Caregivers keep their full earnings, making quality care more affordable</p>
              </div>
              
              <div className="text-center">
                <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h4 className="font-semibold mb-2">Continuous Safety</h4>
                <p className="text-sm text-gray-600">Quarterly checks ensure ongoing safety without hidden costs</p>
              </div>
              
              <div className="text-center">
                <div className="bg-purple-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="font-semibold mb-2">Sustainable Quality</h4>
                <p className="text-sm text-gray-600">Fair pricing attracts and retains the best caregivers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 px-4 bg-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Families Choose Beehive Over Others
            </h2>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left">Safety Feature</th>
                    <th className="px-6 py-4 text-center">Beehive</th>
                    <th className="px-6 py-4 text-center">Others</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {comparisonData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{row.feature}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-green-600 font-semibold">{row.beehive}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-gray-500">{row.others}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Mandated Compliant Background Checks", icon: <Shield className="w-8 h-8" /> },
              { label: "HIPAA Certified", icon: <Lock className="w-8 h-8" /> },
              { label: "24/7 Monitoring", icon: <Eye className="w-8 h-8" /> },
              { label: "Insured & Bonded", icon: <CheckCircle className="w-8 h-8" /> }
            ].map((badge, index) => (
              <div key={index} className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-lg">
                <div className="text-blue-600 mb-3">{badge.icon}</div>
                <span className="text-sm font-semibold text-gray-700">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            It's Our Turn to Care for Our Parents in the Best Way!
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            70% rejection rate. 3-level screening. Continuous monitoring. 
            This is what real protection looks like.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              className="px-8 py-4 bg-yellow-400 text-gray-900 rounded-lg font-semibold text-lg hover:bg-yellow-300 transition-colors cursor-not-allowed opacity-75"
              disabled
            >
              Start Finding Safe Caregivers
            </button>
            <button 
              className="px-8 py-4 bg-gray-700 text-white rounded-lg font-semibold text-lg hover:bg-gray-600 transition-colors border border-gray-600 cursor-not-allowed opacity-75"
              disabled
            >
              Apply to Be a Caregiver
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}