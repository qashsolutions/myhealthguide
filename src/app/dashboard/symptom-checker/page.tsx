'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Phone,
  Heart,
  Stethoscope,
  CheckCircle2,
  HelpCircle,
  Shield,
  RefreshCw,
  UserCircle,
  History,
  ThumbsUp,
  ThumbsDown,
  Printer,
  Download,
  Bot,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { useSmartMetrics } from '@/hooks/useSmartMetrics';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import {
  SymptomCheckerRequest,
  SymptomCheckerResponse,
  SymptomCheckerAIResponse,
  SymptomCheckerFormData,
  GENDER_OPTIONS,
  DIET_TYPE_OPTIONS,
  ACTIVITY_LEVEL_OPTIONS,
  ALCOHOL_USE_OPTIONS,
  RATE_LIMITS,
  URGENCY_LEVEL_CONFIG,
  Gender,
  DietType,
  AlcoholUse,
  ActivityLevel,
  UrgencyLevel,
  FeedbackRating,
} from '@/types/symptomChecker';
import { ClipboardHeartIcon } from '@/components/icons/ClipboardHeartIcon';

interface PastQuery {
  id: string;
  symptomsDescription: string;
  createdAt: Date;
  urgencyLevel?: UrgencyLevel;
  initialResponse?: string;
}

export default function AuthenticatedSymptomCheckerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedElder, isLoading: elderLoading } = useElder();

  // Smart Learning System hooks
  const { trackResponse, trackAction } = useSmartMetrics({ feature: 'symptom_checker' });
  useFeatureTracking('symptom_checker');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRefinement, setShowRefinement] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pastQueries, setPastQueries] = useState<PastQuery[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form data
  const [formData, setFormData] = useState<SymptomCheckerFormData>({
    age: '',
    gender: '',
    symptomsDescription: '',
    medications: '',
    knownConditions: '',
    dietType: '',
    smoker: null,
    alcoholUse: '',
    activityLevel: '',
  });

  // Results
  const [queryId, setQueryId] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<SymptomCheckerAIResponse | null>(null);
  const [rateLimit, setRateLimit] = useState<{ used: number; remaining: number; limit: number } | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Feedback
  const [feedbackGiven, setFeedbackGiven] = useState<FeedbackRating | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Auto-populate from elder profile
  useEffect(() => {
    if (selectedElder) {
      // Calculate age from dateOfBirth or use approximateAge
      let age = '';
      if (selectedElder.dateOfBirth) {
        const dob = selectedElder.dateOfBirth instanceof Date
          ? selectedElder.dateOfBirth
          : new Date((selectedElder.dateOfBirth as any).seconds * 1000);
        const today = new Date();
        const calculatedAge = today.getFullYear() - dob.getFullYear();
        age = calculatedAge.toString();
      } else if (selectedElder.approximateAge) {
        age = selectedElder.approximateAge.toString();
      }

      // Get gender
      const gender = selectedElder.gender || '';

      // Get known conditions
      const knownConditions = selectedElder.knownConditions?.join(', ') || '';

      // Get dietary restrictions as diet type hint
      const dietaryRestrictions = selectedElder.dietaryRestrictions || [];
      let dietType: DietType | '' = '';
      if (dietaryRestrictions.some(r => r.toLowerCase().includes('vegetarian'))) {
        dietType = 'vegetarian';
      } else if (dietaryRestrictions.some(r => r.toLowerCase().includes('vegan'))) {
        dietType = 'vegan';
      } else if (dietaryRestrictions.some(r => r.toLowerCase().includes('diabetic'))) {
        dietType = 'diabetic_friendly';
      } else if (dietaryRestrictions.some(r => r.toLowerCase().includes('low sodium'))) {
        dietType = 'low_sodium';
      }

      setFormData(prev => ({
        ...prev,
        age,
        gender: gender as Gender | '',
        knownConditions,
        dietType,
      }));

      // Fetch medications for this elder
      fetchElderMedications(selectedElder.groupId, selectedElder.id);

      // Fetch past queries
      fetchPastQueries(selectedElder.id);
    }
  }, [selectedElder]);

  const fetchElderMedications = async (groupId: string, elderId: string) => {
    try {
      const medsQuery = query(
        collection(db, 'medications'),
        where('groupId', '==', groupId),
        where('elderId', '==', elderId),
        where('active', '==', true)
      );
      const medsSnapshot = await getDocs(medsQuery);
      const medications = medsSnapshot.docs.map(doc => {
        const data = doc.data();
        return `${data.name}${data.dosage ? ` ${data.dosage}` : ''}`;
      });

      if (medications.length > 0) {
        setFormData(prev => ({ ...prev, medications: medications.join(', ') }));
      }
    } catch (err) {
      console.error('Error fetching medications:', err);
    }
  };

  const fetchPastQueries = async (elderId: string) => {
    setLoadingHistory(true);
    try {
      const queriesQuery = query(
        collection(db, 'symptomCheckerQueries'),
        where('elderId', '==', elderId),
        orderBy('createdAt', 'desc'),
        limit(20) // Increased limit for better history
      );
      const snapshot = await getDocs(queriesQuery);
      const queries: PastQuery[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          symptomsDescription: data.symptomsDescription,
          createdAt: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : new Date(data.createdAt),
          urgencyLevel: data.urgencyLevel as UrgencyLevel | undefined,
          initialResponse: data.initialResponse,
        };
      });
      setPastQueries(queries);
    } catch (err) {
      console.error('Error fetching past queries:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFormChange = (field: keyof SymptomCheckerFormData, value: string | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const submitSymptomCheck = async (isRefinement = false) => {
    if (!selectedElder) {
      setError('Please select an elder first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const requestBody: SymptomCheckerRequest = {
        age: parseInt(formData.age, 10),
        gender: formData.gender as Gender,
        symptomsDescription: formData.symptomsDescription,
        elderId: selectedElder.id,
        elderName: selectedElder.name,
        medications: formData.medications || undefined,
        knownConditions: formData.knownConditions || undefined,
        dietType: formData.dietType as DietType || undefined,
        smoker: formData.smoker ?? undefined,
        alcoholUse: formData.alcoholUse as AlcoholUse || undefined,
        activityLevel: formData.activityLevel as ActivityLevel || undefined,
        isRefinement,
        previousQueryId: isRefinement ? queryId || undefined : undefined,
      };

      const response = await authenticatedFetch('/api/symptom-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check symptoms');
      }

      const result = data as SymptomCheckerResponse;
      setQueryId(result.queryId);
      setAiResponse(result.response);
      setRateLimit(result.rateLimit);
      setShowResults(true);
      setShowRefinement(false);

      // Track response for Smart Learning System
      if (result.queryId && result.response) {
        const responseText = JSON.stringify(result.response);
        trackResponse(result.queryId, responseText);
      }

      // Refresh past queries
      fetchPastQueries(selectedElder.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const age = parseInt(formData.age, 10);
    if (isNaN(age) || age < 0 || age > 120) {
      setError('Please enter a valid age between 0 and 120');
      return;
    }
    if (!formData.gender) {
      setError('Please select a gender');
      return;
    }
    if (!formData.symptomsDescription || formData.symptomsDescription.length < 10) {
      setError('Please describe the symptoms in at least 10 characters');
      return;
    }

    await submitSymptomCheck(false);
  };

  const handleRefinement = async () => {
    await submitSymptomCheck(true);
  };

  const handleNewCheck = () => {
    // Reset symptoms but keep elder profile data
    setFormData(prev => ({
      ...prev,
      symptomsDescription: '',
    }));
    setQueryId(null);
    setAiResponse(null);
    setShowResults(false);
    setShowRefinement(false);
    setFeedbackGiven(null);
  };

  const handleFeedback = async (rating: FeedbackRating) => {
    if (!queryId || feedbackGiven) return;

    setFeedbackLoading(true);
    try {
      const response = await authenticatedFetch('/api/symptom-checker/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryId, rating }),
      });

      if (response.ok) {
        setFeedbackGiven(rating);

        // Track action for Smart Learning System
        trackAction(queryId, `feedback_${rating}`);
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    // Simple PDF export using print dialog
    // In production, could use a library like jsPDF for better PDF generation
    window.print();
  };

  // Helper to group queries by date
  const groupQueriesByDate = (queries: PastQuery[]) => {
    const groups: { [key: string]: PastQuery[] } = {};
    queries.forEach(query => {
      const dateKey = query.createdAt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(query);
    });
    return groups;
  };

  // Show loading while checking auth/elder
  if (elderLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Show elder selection prompt if no elder selected
  if (!selectedElder) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card className="shadow-lg border-2 border-blue-200 dark:border-blue-800">
          <CardContent className="p-8 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-blue-100 dark:bg-blue-900/30 mb-6">
              <UserCircle className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Select an Elder First
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please select an elder from the dropdown in the header to check their symptoms.
              This allows us to use their health profile for a more personalized assessment.
            </p>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show results
  if (showResults && aiResponse) {
    const urgencyConfig = URGENCY_LEVEL_CONFIG[aiResponse.urgencyLevel || 'moderate'];

    return (
      <div className="max-w-3xl mx-auto py-8 px-4 print:py-4">
        {/* Dynamic Emergency Banner */}
        {aiResponse.isEmergency && (
          <Alert variant="destructive" className="mb-6 border-2 border-red-500 bg-red-100 dark:bg-red-900/40 print:break-inside-avoid">
            <Phone className="w-5 h-5" />
            <AlertTitle className="text-lg font-bold">CALL 911 IMMEDIATELY</AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-200">
              {aiResponse.emergencyReason || 'Based on the symptoms described, this may be a medical emergency. Please call 911 or go to the nearest emergency room immediately.'}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between mb-6 print:mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Symptom Assessment for {selectedElder.name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              {rateLimit && (
                <Badge variant="outline">
                  {rateLimit.used} of {rateLimit.limit} checks used today
                </Badge>
              )}
            </div>
          </div>
          {/* Print/Export buttons - hidden on print */}
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handlePrint} title="Print for doctor visit">
              <Printer className="w-4 h-4 mr-1" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} title="Export as PDF">
              <Download className="w-4 h-4 mr-1" />
              PDF
            </Button>
          </div>
        </div>

        {/* Urgency Level Indicator */}
        <Card className={`shadow-lg mb-6 border-l-4 ${urgencyConfig.borderColor} print:break-inside-avoid`}>
          <CardContent className={`p-4 ${urgencyConfig.bgColor}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${urgencyConfig.bgColor}`}>
                  {aiResponse.urgencyLevel === 'emergency' ? (
                    <Phone className={`w-5 h-5 ${urgencyConfig.color}`} />
                  ) : aiResponse.urgencyLevel === 'urgent' ? (
                    <AlertTriangle className={`w-5 h-5 ${urgencyConfig.color}`} />
                  ) : (
                    <Shield className={`w-5 h-5 ${urgencyConfig.color}`} />
                  )}
                </div>
                <div>
                  <p className={`font-semibold ${urgencyConfig.color}`}>
                    {urgencyConfig.label}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {urgencyConfig.description}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assessment Card */}
        <Card className="shadow-lg mb-6 print:break-inside-avoid">
          <CardHeader className="bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Assessment Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Headline - quick summary */}
            {aiResponse.assessmentHeadline && (
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                {aiResponse.assessmentHeadline}
              </p>
            )}
            {/* Detailed assessment */}
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {aiResponse.assessment}
            </p>
          </CardContent>
        </Card>

        {/* Possible Causes */}
        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <HelpCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Possible Causes to Discuss with Doctor
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-2">
              {aiResponse.possibleCauses.map((cause, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">{index + 1}.</span>
                  {cause}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Recommended Next Steps */}
        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              Recommended Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-2">
              {aiResponse.recommendedNextSteps.map((step, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  {step}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Red Flags */}
        <Card className="shadow-lg mb-6 border-2 border-red-200 dark:border-red-900">
          <CardHeader className="bg-red-50 dark:bg-red-900/20">
            <CardTitle className="flex items-center gap-2 text-lg text-red-700 dark:text-red-300">
              <AlertTriangle className="w-5 h-5" />
              Red Flags to Watch For
            </CardTitle>
            <CardDescription className="text-red-600 dark:text-red-400">
              Seek immediate medical attention if any of these occur
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-2">
              {aiResponse.redFlagsToWatch.map((flag, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  {flag}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Questions for Doctor */}
        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Stethoscope className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Questions to Ask the Doctor
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-2">
              {aiResponse.questionsForDoctor.map((question, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">Q:</span>
                  {question}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Refinement Section */}
        <Collapsible open={showRefinement} onOpenChange={setShowRefinement}>
          <Card className="shadow-lg mb-6">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Update Information
                  </span>
                  {showRefinement ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </CardTitle>
                <CardDescription>
                  Add or update additional information for a refined assessment
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="p-6 space-y-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="activity">Activity Level</Label>
                    <Select
                      value={formData.activityLevel}
                      onValueChange={(value) => handleFormChange('activityLevel', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_LEVEL_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alcohol">Alcohol Use</Label>
                    <Select
                      value={formData.alcoholUse}
                      onValueChange={(value) => handleFormChange('alcoholUse', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {ALCOHOL_USE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Smoking Status</Label>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={formData.smoker === true ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFormChange('smoker', true)}
                    >
                      Yes
                    </Button>
                    <Button
                      type="button"
                      variant={formData.smoker === false ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFormChange('smoker', false)}
                    >
                      No
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleRefinement}
                  disabled={isLoading}
                  className="w-full mt-4"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Refining...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Get Refined Assessment
                    </>
                  )}
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* AI Notice */}
        <Alert className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 print:break-inside-avoid">
          <Bot className="w-4 h-4 text-blue-600" />
          <AlertTitle className="text-blue-700 dark:text-blue-300">AI-Generated Response</AlertTitle>
          <AlertDescription className="text-blue-600 dark:text-blue-400 text-sm">
            {aiResponse.aiNotice || 'This response was generated by AI and may contain errors or inaccuracies. AI cannot replace professional medical judgment. Please consult a qualified healthcare provider for medical advice.'}
          </AlertDescription>
        </Alert>

        {/* Disclaimer */}
        <Alert className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 print:break-inside-avoid">
          <Shield className="w-4 h-4 text-amber-600" />
          <AlertTitle className="text-amber-700 dark:text-amber-300">Important Reminder</AlertTitle>
          <AlertDescription className="text-amber-600 dark:text-amber-400 text-sm">
            {aiResponse.disclaimer}
          </AlertDescription>
        </Alert>

        {/* Feedback Section - hidden on print */}
        <Card className="mb-6 print:hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Was this assessment helpful?
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Your feedback helps us improve
                </p>
              </div>
              <div className="flex gap-2">
                {feedbackGiven ? (
                  <Badge variant="outline" className="py-1.5">
                    <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" />
                    Thank you for your feedback!
                  </Badge>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFeedback('helpful')}
                      disabled={feedbackLoading}
                      className="hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-900/20"
                    >
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      Helpful
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFeedback('not_helpful')}
                      disabled={feedbackLoading}
                      className="hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20"
                    >
                      <ThumbsDown className="w-4 h-4 mr-1" />
                      Not Helpful
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Note about Family Updates */}
        <Alert className="mb-6 print:break-inside-avoid">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-gray-600 dark:text-gray-400 text-sm">
            This symptom check has been saved and will be included in {selectedElder.name}&apos;s Family Updates report.
          </AlertDescription>
        </Alert>

        {/* Action Button - hidden on print */}
        <Button onClick={handleNewCheck} variant="outline" className="w-full print:hidden">
          <RefreshCw className="w-4 h-4 mr-2" />
          Check New Symptoms
        </Button>
      </div>
    );
  }

  // Show form
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <div className="inline-flex p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30 mb-4">
          <ClipboardHeartIcon size={32} className="text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Check Symptoms for {selectedElder.name}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {selectedElder.name}&apos;s profile information has been pre-filled
        </p>
      </div>

      {/* Emergency Warning */}
      <Alert variant="destructive" className="mb-6 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <Phone className="w-4 h-4" />
        <AlertTitle>For Emergencies, Call 911</AlertTitle>
        <AlertDescription>
          If {selectedElder.name} is experiencing a medical emergency — call 911 immediately.
        </AlertDescription>
      </Alert>

      <Card className="shadow-lg">
        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Pre-filled Profile Info (read-only) */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <UserCircle className="w-4 h-4" />
                {selectedElder.name}&apos;s Profile (Pre-filled)
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Age:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{formData.age || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Gender:</span>{' '}
                  <span className="text-gray-900 dark:text-white capitalize">{formData.gender || 'Not set'}</span>
                </div>
              </div>
              {formData.knownConditions && (
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Known Conditions:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{formData.knownConditions}</span>
                </div>
              )}
              {formData.medications && (
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Medications:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{formData.medications}</span>
                </div>
              )}
            </div>

            {/* Symptoms Input */}
            <div className="space-y-2">
              <Label htmlFor="symptoms">
                Describe the Symptoms <span className="text-red-500">*</span>
                <span className="text-gray-500 text-xs ml-2">
                  ({formData.symptomsDescription.length}/2000)
                </span>
              </Label>
              <Textarea
                id="symptoms"
                value={formData.symptomsDescription}
                onChange={(e) => handleFormChange('symptomsDescription', e.target.value)}
                placeholder={`Describe what symptoms ${selectedElder.name} is experiencing. Include when they started, how severe they are, and if anything makes them better or worse...`}
                rows={5}
                maxLength={2000}
                required
              />
              <p className="text-xs text-gray-500">
                Be specific. For example: &quot;Headache that started 2 days ago, mostly on the right side, feels like pressure, worse in bright light&quot;
              </p>
            </div>

            {/* Past Queries - Grouped by date */}
            {pastQueries.length > 0 && (
              <Collapsible open={showHistory} onOpenChange={setShowHistory}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Symptom Check History ({pastQueries.length})
                    </span>
                    {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg max-h-64 overflow-y-auto">
                    {Object.entries(groupQueriesByDate(pastQueries)).map(([date, queries]) => (
                      <div key={date} className="mb-4 last:mb-0">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <Calendar className="w-4 h-4" />
                          {date} ({queries.length})
                        </div>
                        <div className="space-y-2 pl-6">
                          {queries.map((query) => {
                            const urgency = query.urgencyLevel ? URGENCY_LEVEL_CONFIG[query.urgencyLevel] : null;
                            return (
                              <div key={query.id} className="text-sm border-l-2 border-gray-200 dark:border-gray-700 pl-3 py-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-gray-500 dark:text-gray-400 text-xs">
                                    {query.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {urgency && (
                                    <Badge variant="outline" className={`text-xs ${urgency.color}`}>
                                      {urgency.label}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-gray-700 dark:text-gray-300">
                                  {query.symptomsDescription.length > 100
                                    ? query.symptomsDescription.substring(0, 100) + '...'
                                    : query.symptomsDescription}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 p-6">
            <Button type="submit" disabled={isLoading} className="w-full" size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Stethoscope className="w-4 h-4 mr-2" />
                  Check Symptoms
                </>
              )}
            </Button>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              <Shield className="w-3 h-3 inline mr-1" />
              {RATE_LIMITS.registered} checks per day • Results included in Family Updates
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
