'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  ChevronRight
} from 'lucide-react';

export default function BeehiveLandingPage() {
  const [expandedFear, setExpandedFear] = useState<number | null>(null);
  const [selectedScreeningLevel, setSelectedScreeningLevel] = useState(1);

  const fears = [
    {
      id: 1,
      title: "What if they have a violent past?",
      icon: <AlertTriangle className="w-8 h-8 text-red-600" />,
      description: "You Google their name and find nothing. But what if they've hurt someone before? What if they lose their temper with your confused father who keeps asking the same question?",
      stat: "40% of elder abuse is physical violence",
      color: "red"
    },
    {
      id: 2,
      title: "What if they're a criminal?",
      icon: <UserX className="w-8 h-8 text-red-600" />,
      description: "Background checks miss things. Name changes. Sealed records. Crimes in other states. What if they've done time for assault, theft, or worse?",
      stat: "Standard checks only cover 7 years in 1 state",
      color: "red"
    },
    {
      id: 3,
      title: "What if they snap under pressure?",
      icon: <Brain className="w-8 h-8 text-orange-600" />,
      description: "Your mom with dementia might scream, hit, say terrible things. What if the caregiver can't handle it? What if they push back, restrain too hard, or retaliate?",
      stat: "Caregiver violence often triggered by care recipient aggression",
      color: "orange"
    },
    {
      id: 4,
      title: "What if they're predators?",
      icon: <Eye className="w-8 h-8 text-red-700" />,
      description: "Elder sexual abuse is real and underreported. Your vulnerable parent can't defend themselves. How do you know this person isn't dangerous?",
      stat: "83% of elder sexual abuse is by caregivers",
      color: "red"
    },
    {
      id: 5,
      title: "What if they have substance abuse issues?",
      icon: <AlertCircle className="w-8 h-8 text-amber-600" />,
      description: "They seem fine at interview. But what if they're high while caring for your parent? Stealing medications? Making dangerous mistakes?",
      stat: "1 in 8 healthcare workers struggle with substance abuse",
      color: "amber"
    }
  ];

  const screeningLevels = [
    {
      level: 1,
      title: "IDENTITY VERIFICATION",
      checks: [
        "Government ID + facial recognition match",
        "SSN verification (detecting fake identities)",
        "Address history (finding hidden relocations)",
        "Alias/name change search"
      ],
      conclusion: "We know exactly who they really are"
    },
    {
      level: 2,
      title: "COMPREHENSIVE CRIMINAL SEARCH",
      checks: [
        "All 50 states + territories",
        "Federal crimes database",
        "10-year history (not just 7)",
        "County-level court records",
        "Active warrant searches",
        "Elder abuse registry (all states)",
        "Sex offender registry (nationwide)",
        "Healthcare exclusion lists"
      ],
      conclusion: "No stone left unturned"
    },
    {
      level: 3,
      title: "BEHAVIORAL RED FLAGS",
      checks: [
        "DUIs and substance indicators",
        "Road rage and aggressive driving",
        "Restraining orders and domestic disputes",
        "Evictions and financial crimes",
        "Social media violence indicators",
        "Civil court records",
        "Professional license violations"
      ],
      conclusion: "AI scans for violence predictors"
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

  const rejectionStats = [
    { reason: "Failed criminal background", count: 456, percentage: 16 },
    { reason: "Failed violence risk assessment", count: 234, percentage: 8 },
    { reason: "Concerning references", count: 189, percentage: 7 },
    { reason: "Substance abuse indicators", count: 167, percentage: 6 },
    { reason: "Restraining orders/DV history", count: 98, percentage: 3 },
    { reason: "On abuse registries", count: 43, percentage: 2 }
  ];

  const testimonials = [
    {
      quote: "My father was abused by a previous aide who turned out to have assault charges. Beehive found things two other agencies missed.",
      author: "Margaret T.",
      location: "New York, NY"
    },
    {
      quote: "The psychometric test revealed anger issues that weren't obvious in the interview. Probably saved my mom from harm.",
      author: "David K.",
      location: "Los Angeles, CA"
    },
    {
      quote: "When they showed me the 94% safety score with detailed criminal clearance, I finally exhaled.",
      author: "Susan P.",
      location: "Chicago, IL"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - Dark and Serious */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-800 text-white py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">
            Your Parent's Safety Is Not Negotiable
          </h1>
          <p className="text-2xl mb-8 text-gray-300">
            The most comprehensive criminal screening and violence prevention in eldercare
          </p>
          <div className="flex gap-4 justify-center">
            <Link 
              href="/beehive/find-caregivers"
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-lg transition-colors"
            >
              Start Safety Screening
            </Link>
            <button className="px-8 py-4 bg-transparent border-2 border-white hover:bg-white hover:text-gray-900 text-white font-bold rounded-lg text-lg transition-colors">
              View Sample Report
            </button>
          </div>
        </div>
      </section>

      {/* Fears Section */}
      <section className="py-20 px-4 bg-red-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
            The Nightmares That Keep You Awake
          </h2>
          <p className="text-xl text-center mb-12 text-gray-700">
            We know what terrifies you. We built our platform to eliminate these fears.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fears.map((fear) => (
              <div
                key={fear.id}
                className="bg-white rounded-lg shadow-lg p-6 border-2 border-red-200 hover:border-red-400 transition-colors cursor-pointer"
                onClick={() => setExpandedFear(expandedFear === fear.id ? null : fear.id)}
              >
                <div className="flex items-start gap-4 mb-4">
                  {fear.icon}
                  <h3 className="text-xl font-bold text-gray-900 flex-1">
                    {fear.title}
                  </h3>
                </div>
                
                {expandedFear === fear.id && (
                  <div className="space-y-4">
                    <p className="text-gray-700">
                      {fear.description}
                    </p>
                    <div className="bg-red-100 p-3 rounded">
                      <p className="text-sm font-semibold text-red-900">
                        {fear.stat}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Criminal Screening Section */}
      <section className="py-20 px-4 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">
            We Check Everything. Then Check Again.
          </h2>
          <p className="text-xl text-center mb-12 text-gray-300">
            3-layer security screening that catches what others miss
          </p>

          {/* Screening Level Selector */}
          <div className="flex justify-center gap-4 mb-12">
            {screeningLevels.map((level) => (
              <button
                key={level.level}
                onClick={() => setSelectedScreeningLevel(level.level)}
                className={`px-6 py-3 rounded-lg font-bold transition-all ${
                  selectedScreeningLevel === level.level
                    ? 'bg-red-600 text-white scale-105'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                LEVEL {level.level}
              </button>
            ))}
          </div>

          {/* Selected Level Details */}
          <div className="bg-gray-800 rounded-lg p-8 border-2 border-red-600">
            <h3 className="text-2xl font-bold mb-6 text-red-400">
              {screeningLevels[selectedScreeningLevel - 1].title}
            </h3>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {screeningLevels[selectedScreeningLevel - 1].checks.map((check, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">{check}</span>
                </div>
              ))}
            </div>
            <div className="bg-red-900/30 p-4 rounded">
              <p className="text-lg font-semibold text-red-300">
                {screeningLevels[selectedScreeningLevel - 1].conclusion}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Psychometric Testing Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
            Testing for Hidden Aggression
          </h2>
          <p className="text-xl text-center mb-12 text-gray-700">
            Scenario-based testing reveals violence risk before hiring
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {psychometricTests.map((test, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
                <h4 className="font-bold text-lg mb-3 text-gray-900">
                  Scenario {idx + 1}: {test.scenario}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded border border-red-200">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-red-700">Red Flag Answer:</span>
                      <p className="text-gray-700">{test.redFlag}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded border border-green-200">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-green-700">Safe Answer:</span>
                      <p className="text-gray-700">{test.safe}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Violence Risk Meter */}
          <div className="mt-12 bg-gray-900 text-white rounded-lg p-8">
            <h3 className="text-2xl font-bold mb-6">Violence Risk Scoring</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-3">We Measure:</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Impulse control under stress</li>
                  <li>• Anger management capability</li>
                  <li>• Previous conflict resolution</li>
                  <li>• Empathy under pressure</li>
                  <li>• Substance abuse indicators</li>
                  <li>• Power/control seeking</li>
                </ul>
              </div>
              <div className="md:col-span-2">
                <div className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-600 h-12 rounded-full relative">
                  <div className="absolute left-[20%] top-1/2 transform -translate-y-1/2">
                    <div className="bg-white text-gray-900 px-3 py-1 rounded font-bold">
                      Threshold: 20/100
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-lg font-semibold">
                  Anyone scoring above 20/100 on violence risk is automatically rejected
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rejection Statistics */}
      <section className="py-20 px-4 bg-gray-100">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
            Who We've Rejected and Why
          </h2>
          <p className="text-xl text-center mb-12 text-gray-700">
            Only 60% make it through our screening
          </p>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg">Total Applicants</span>
                <span className="text-2xl font-bold">2,847</span>
              </div>
              <div className="bg-gray-200 h-4 rounded-full overflow-hidden">
                <div className="bg-green-600 h-full" style={{ width: '60%' }}></div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-sm text-gray-600">Rejected: 40%</span>
                <span className="text-sm font-bold text-green-600">Approved: 60% (1,710)</span>
              </div>
            </div>

            <div className="space-y-4">
              {rejectionStats.map((stat, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded">
                  <span className="font-medium">{stat.reason}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-bold">{stat.count}</span>
                    <span className="text-sm text-gray-600">({stat.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Continuous Monitoring */}
      <section className="py-20 px-4 bg-gray-800 text-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">
            Screening Doesn't Stop After Hiring
          </h2>
          <p className="text-xl text-center mb-12 text-gray-300">
            24/7 monitoring for your peace of mind
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-700 rounded-lg p-6">
              <RefreshCw className="w-12 h-12 text-blue-400 mb-4" />
              <h3 className="text-xl font-bold mb-3">Monthly Re-checks</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• New criminal records</li>
                <li>• New arrests/charges</li>
                <li>• License suspensions</li>
                <li>• Court proceedings</li>
              </ul>
            </div>

            <div className="bg-gray-700 rounded-lg p-6">
              <Eye className="w-12 h-12 text-yellow-400 mb-4" />
              <h3 className="text-xl font-bold mb-3">Behavioral Monitoring</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Complaint patterns</li>
                <li>• Tardiness/absence</li>
                <li>• Care recipient fear indicators</li>
                <li>• Family discomfort reports</li>
              </ul>
            </div>

            <div className="bg-gray-700 rounded-lg p-6">
              <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
              <h3 className="text-xl font-bold mb-3">Instant Review Triggers</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Any police contact</li>
                <li>• Any injury to care recipient</li>
                <li>• Any aggressive language</li>
                <li>• Any boundary violation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">
            Families Who Found Peace of Mind
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
                <div className="mb-4">
                  <div className="flex gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Shield key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.quote}"</p>
                <div className="text-sm">
                  <p className="font-bold text-gray-900">{testimonial.author}</p>
                  <p className="text-gray-600">{testimonial.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency Protocol */}
      <section className="py-20 px-4 bg-red-600 text-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">
            If You Ever Feel Unsafe
          </h2>
          <p className="text-xl text-center mb-12">
            Our zero-tolerance violence protocol
          </p>

          <div className="bg-white/10 rounded-lg p-8 backdrop-blur">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold mb-4">Immediate Actions:</h3>
                <ol className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="bg-white text-red-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</span>
                    <span>One-tap SOS button → Instant response</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-white text-red-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</span>
                    <span>Caregiver immediately suspended</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-white text-red-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</span>
                    <span>Wellness check dispatched</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-white text-red-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">4</span>
                    <span>Police coordination if needed</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-white text-red-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">5</span>
                    <span>New caregiver within 2 hours</span>
                  </li>
                </ol>
              </div>

              <div className="flex items-center justify-center">
                <div className="bg-white text-red-600 rounded-lg p-8 text-center">
                  <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
                  <h4 className="text-2xl font-bold mb-2">Our Promise</h4>
                  <p className="text-lg">First sign of aggression =</p>
                  <p className="text-xl font-bold">Permanent removal</p>
                  <p className="text-sm mt-2">Zero tolerance. Zero exceptions.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-4 bg-gray-100">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">
            What Others Miss vs What We Catch
          </h2>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-900 text-white">
                <tr>
                  <th className="px-6 py-4 text-left">Screening Area</th>
                  <th className="px-6 py-4 text-left">Others</th>
                  <th className="px-6 py-4 text-left">Beehive</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-6 py-4 font-semibold">Criminal History</td>
                  <td className="px-6 py-4 text-gray-600">Basic 7-year check</td>
                  <td className="px-6 py-4 text-green-600 font-semibold">10-year, 50-state + federal + registries</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="px-6 py-4 font-semibold">References</td>
                  <td className="px-6 py-4 text-gray-600">Trust references</td>
                  <td className="px-6 py-4 text-green-600 font-semibold">AI analyzes reference authenticity</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-semibold">Temperament</td>
                  <td className="px-6 py-4 text-gray-600">Hope they're calm</td>
                  <td className="px-6 py-4 text-green-600 font-semibold">Test 8 stress scenarios</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 font-semibold">Violence Risk</td>
                  <td className="px-6 py-4 text-gray-600">React to incidents</td>
                  <td className="px-6 py-4 text-green-600 font-semibold">Predict violence risk before hiring</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-gray-900 to-red-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Your Parent Deserves Maximum Protection
          </h2>
          <p className="text-xl mb-8">
            We run the same background checks used for FBI employment
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link 
              href="/beehive/find-caregivers"
              className="px-8 py-4 bg-white text-red-600 hover:bg-gray-100 font-bold rounded-lg text-lg transition-colors inline-flex items-center justify-center gap-2"
            >
              Start Finding Safe Caregivers
              <ChevronRight className="w-5 h-5" />
            </Link>
            <button className="px-8 py-4 bg-transparent border-2 border-white hover:bg-white hover:text-gray-900 font-bold rounded-lg text-lg transition-colors inline-flex items-center justify-center gap-2">
              <FileText className="w-5 h-5" />
              Download Safety Protocol PDF
            </button>
          </div>

          <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-white/20">
            <div>
              <div className="text-3xl font-bold">50-State</div>
              <div className="text-sm">Criminal Search</div>
            </div>
            <div>
              <div className="text-3xl font-bold">Monthly</div>
              <div className="text-sm">Re-screening</div>
            </div>
            <div>
              <div className="text-3xl font-bold">$1M</div>
              <div className="text-sm">Insurance Coverage</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Trust Badges */}
      <section className="py-12 px-4 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <Lock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-400">Licensed Private<br />Investigation Partner</p>
            </div>
            <div>
              <Shield className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-400">Violence screening by<br />Forensic Psychologists</p>
            </div>
            <div>
              <RefreshCw className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-400">Every caregiver<br />re-checked monthly</p>
            </div>
            <div>
              <Phone className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-400">24/7 Emergency<br />Response Team</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}