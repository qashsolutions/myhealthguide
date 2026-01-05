'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  ArrowRight,
  Shield,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
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
  Gender,
  DietType,
  AlcoholUse,
  ActivityLevel,
} from '@/types/symptomChecker';
import { ClipboardHeartIcon } from '@/components/icons/ClipboardHeartIcon';

type Screen = 'disclaimer' | 'form' | 'results' | 'limit-reached';

export default function PublicSymptomCheckerPage() {
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState<Screen>('disclaimer');
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRefinement, setShowRefinement] = useState(false);

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

  const handleFormChange = (field: keyof SymptomCheckerFormData, value: string | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const submitSymptomCheck = async (isRefinement = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const requestBody: SymptomCheckerRequest = {
        age: parseInt(formData.age, 10),
        gender: formData.gender as Gender,
        symptomsDescription: formData.symptomsDescription,
        medications: formData.medications || undefined,
        knownConditions: formData.knownConditions || undefined,
        dietType: formData.dietType as DietType || undefined,
        smoker: formData.smoker ?? undefined,
        alcoholUse: formData.alcoholUse as AlcoholUse || undefined,
        activityLevel: formData.activityLevel as ActivityLevel || undefined,
        isRefinement,
        previousQueryId: isRefinement ? queryId || undefined : undefined,
      };

      const response = await fetch('/api/symptom-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setCurrentScreen('limit-reached');
          return;
        }
        throw new Error(data.error || 'Failed to check symptoms');
      }

      const result = data as SymptomCheckerResponse;
      setQueryId(result.queryId);
      setAiResponse(result.response);
      setRateLimit(result.rateLimit);
      setCurrentScreen('results');
      setShowRefinement(false);
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
    setFormData({
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
    setQueryId(null);
    setAiResponse(null);
    setShowRefinement(false);
    setCurrentScreen('form');
  };

  // Render Disclaimer Screen
  if (currentScreen === 'disclaimer') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 rounded-2xl bg-blue-100 dark:bg-blue-900/30 mb-4">
              <ClipboardHeartIcon size={48} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Symptom Checker</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Get helpful information about your symptoms
            </p>
          </div>

          <Card className="border-2 border-orange-200 dark:border-orange-900 shadow-lg">
            <CardHeader className="bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800">
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <AlertTriangle className="w-5 h-5" />
                Important Medical Disclaimer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Alert variant="destructive" className="border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <Phone className="w-4 h-4" />
                <AlertTitle>For Emergencies, Call 911</AlertTitle>
                <AlertDescription>
                  If you or your loved one is experiencing a medical emergency, chest pain, difficulty breathing, severe bleeding, or loss of consciousness — <strong>call 911 immediately</strong>.
                </AlertDescription>
              </Alert>

              <div className="space-y-3 text-gray-700 dark:text-gray-300">
                <p>
                  <strong>This is NOT a medical diagnosis tool.</strong> The information provided is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.
                </p>
                <p>
                  <strong>Always consult a doctor.</strong> Only a qualified healthcare professional can properly evaluate symptoms and provide a diagnosis.
                </p>
                <p>
                  <strong>Results are informational only.</strong> We use AI to provide general health information, not to diagnose conditions or prescribe treatments.
                </p>
              </div>

              <div className="flex items-start space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Checkbox
                  id="disclaimer"
                  checked={disclaimerAccepted}
                  onCheckedChange={(checked) => setDisclaimerAccepted(checked === true)}
                />
                <Label htmlFor="disclaimer" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  I understand that this tool does not provide medical advice and should not be used for emergencies. I will consult a healthcare professional for any health concerns.
                </Label>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 p-6">
              <Button
                onClick={() => setCurrentScreen('form')}
                disabled={!disclaimerAccepted}
                className="w-full"
                size="lg"
              >
                I Understand, Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                <Shield className="w-3 h-3 inline mr-1" />
                Guest users: {RATE_LIMITS.guest} checks per day • <Link href="/signup" className="text-blue-600 hover:underline">Sign up</Link> for {RATE_LIMITS.registered} per day
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Render Form Screen
  if (currentScreen === 'form') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Check Symptoms</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Tell us about the symptoms and we&apos;ll provide helpful information
            </p>
          </div>

          <Card className="shadow-lg">
            <form onSubmit={handleSubmit}>
              <CardContent className="p-6 space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Required Fields */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-red-500">*</span> Required Information
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        min="0"
                        max="120"
                        value={formData.age}
                        onChange={(e) => handleFormChange('age', e.target.value)}
                        placeholder="e.g., 72"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value) => handleFormChange('gender', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDER_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symptoms">
                      Describe the Symptoms
                      <span className="text-gray-500 text-xs ml-2">
                        ({formData.symptomsDescription.length}/2000 characters)
                      </span>
                    </Label>
                    <Textarea
                      id="symptoms"
                      value={formData.symptomsDescription}
                      onChange={(e) => handleFormChange('symptomsDescription', e.target.value)}
                      placeholder="Describe what symptoms are being experienced. Include when they started, how severe they are, and if anything makes them better or worse..."
                      rows={5}
                      maxLength={2000}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Be specific. For example: &quot;Headache that started 2 days ago, mostly on the right side, feels like pressure, worse in bright light&quot;
                    </p>
                  </div>
                </div>
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
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // Render Results Screen
  if (currentScreen === 'results' && aiResponse) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Symptom Assessment</h1>
            {rateLimit && (
              <Badge variant="outline" className="mt-2">
                {rateLimit.used} of {rateLimit.limit} checks used today
              </Badge>
            )}
          </div>

          {/* Assessment Card */}
          <Card className="shadow-lg mb-6">
            <CardHeader className="bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Assessment Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
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
                Possible Causes to Discuss with Your Doctor
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
                Questions to Ask Your Doctor
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
                      Provide Additional Information
                    </span>
                    {showRefinement ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </CardTitle>
                  <CardDescription>
                    Add medications, conditions, or lifestyle info for a more tailored assessment
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-6 space-y-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-2">
                    <Label htmlFor="medications">Current Medications</Label>
                    <Input
                      id="medications"
                      value={formData.medications}
                      onChange={(e) => handleFormChange('medications', e.target.value)}
                      placeholder="e.g., Metformin 500mg, Lisinopril 10mg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="conditions">Known Health Conditions</Label>
                    <Input
                      id="conditions"
                      value={formData.knownConditions}
                      onChange={(e) => handleFormChange('knownConditions', e.target.value)}
                      placeholder="e.g., Type 2 Diabetes, High Blood Pressure"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="diet">Diet Type</Label>
                      <Select
                        value={formData.dietType}
                        onValueChange={(value) => handleFormChange('dietType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select diet" />
                        </SelectTrigger>
                        <SelectContent>
                          {DIET_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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

          {/* Disclaimer */}
          <Alert className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
            <Shield className="w-4 h-4 text-amber-600" />
            <AlertTitle className="text-amber-700 dark:text-amber-300">Important Reminder</AlertTitle>
            <AlertDescription className="text-amber-600 dark:text-amber-400 text-sm">
              {aiResponse.disclaimer}
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleNewCheck} variant="outline" className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Check New Symptoms
            </Button>
            <Link href="/signup" className="flex-1">
              <Button className="w-full">
                <Heart className="w-4 h-4 mr-2" />
                Sign Up for Full Access
              </Button>
            </Link>
          </div>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            <Link href="/" className="hover:underline">Back to Home</Link>
          </p>
        </div>
      </div>
    );
  }

  // Render Rate Limit Reached Screen
  if (currentScreen === 'limit-reached') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6">
        <div className="max-w-lg mx-auto text-center">
          <div className="inline-flex p-4 rounded-2xl bg-orange-100 dark:bg-orange-900/30 mb-6">
            <AlertTriangle className="w-12 h-12 text-orange-600 dark:text-orange-400" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Daily Limit Reached
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-8">
            You&apos;ve used your {RATE_LIMITS.guest} free symptom checks for today. Your limit resets at midnight.
          </p>

          <Card className="mb-8 border-2 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Want More Checks?
              </h2>
              <ul className="text-left space-y-2 text-gray-600 dark:text-gray-400 mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  {RATE_LIMITS.registered} symptom checks per day
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Auto-fill from your elder&apos;s health profile
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Include results in family updates
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Full caregiving suite access
                </li>
              </ul>
              <Link href="/signup">
                <Button className="w-full" size="lg">
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            <Link href="/" className="hover:underline">Back to Home</Link>
          </p>
        </div>
      </div>
    );
  }

  return null;
}
