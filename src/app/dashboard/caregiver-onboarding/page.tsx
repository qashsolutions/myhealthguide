'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  HeartHandshake,
  User,
  Languages,
  Award,
  Briefcase,
  Calendar,
  MapPin,
  Phone,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type {
  CaregiverCertification,
  CaregiverSpecialization,
  CaregiverLanguage,
  CaregiverComfortWith,
} from '@/types';

// Predefined options
const LANGUAGES: { value: CaregiverLanguage; label: string }[] = [
  { value: 'ENGLISH', label: 'English' },
  { value: 'SPANISH', label: 'Spanish' },
  { value: 'MANDARIN', label: 'Mandarin' },
  { value: 'CANTONESE', label: 'Cantonese' },
  { value: 'TAGALOG', label: 'Tagalog' },
  { value: 'VIETNAMESE', label: 'Vietnamese' },
  { value: 'KOREAN', label: 'Korean' },
  { value: 'HINDI', label: 'Hindi' },
  { value: 'ARABIC', label: 'Arabic' },
  { value: 'FRENCH', label: 'French' },
  { value: 'PORTUGUESE', label: 'Portuguese' },
  { value: 'RUSSIAN', label: 'Russian' },
  { value: 'OTHER', label: 'Other' },
];

const CERTIFICATIONS: { value: CaregiverCertification; label: string }[] = [
  { value: 'CNA', label: 'Certified Nursing Assistant (CNA)' },
  { value: 'HHA', label: 'Home Health Aide (HHA)' },
  { value: 'LPN', label: 'Licensed Practical Nurse (LPN)' },
  { value: 'RN', label: 'Registered Nurse (RN)' },
  { value: 'CPR_FIRST_AID', label: 'CPR/First Aid Certified' },
  { value: 'MEDICATION_AIDE', label: 'Medication Aide' },
  { value: 'DEMENTIA_CARE_CERTIFIED', label: 'Dementia Care Certified' },
  { value: 'HOSPICE_CERTIFIED', label: 'Hospice Certified' },
  { value: 'OTHER', label: 'Other' },
];

const SPECIALIZATIONS: { value: CaregiverSpecialization; label: string }[] = [
  { value: 'DEMENTIA_ALZHEIMERS', label: "Dementia/Alzheimer's Care" },
  { value: 'DIABETES_CARE', label: 'Diabetes Care' },
  { value: 'HEART_DISEASE', label: 'Heart Disease' },
  { value: 'PARKINSONS', label: "Parkinson's" },
  { value: 'STROKE_RECOVERY', label: 'Stroke Recovery' },
  { value: 'MOBILITY_ASSISTANCE', label: 'Mobility Assistance' },
  { value: 'WOUND_CARE', label: 'Wound Care' },
  { value: 'HOSPICE_PALLIATIVE', label: 'Hospice/Palliative Care' },
  { value: 'MENTAL_HEALTH', label: 'Mental Health' },
  { value: 'PEDIATRIC', label: 'Pediatric Care' },
  { value: 'OTHER', label: 'Other' },
];

const COMFORT_OPTIONS: { value: CaregiverComfortWith; label: string }[] = [
  { value: 'MALE_PATIENTS', label: 'Male patients' },
  { value: 'FEMALE_PATIENTS', label: 'Female patients' },
  { value: 'PETS_IN_HOME', label: 'Pets in home' },
  { value: 'SMOKING_ENVIRONMENT', label: 'Smoking environment' },
  { value: 'OVERNIGHT_STAYS', label: 'Overnight stays' },
  { value: 'WEEKEND_SHIFTS', label: 'Weekend shifts' },
  { value: 'DRIVING_REQUIRED', label: 'Driving required' },
];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

type Step = 1 | 2 | 3 | 4 | 5;

interface FormData {
  fullName: string;
  languages: CaregiverLanguage[];
  languagesOther: string;
  yearsExperience: string;
  certifications: CaregiverCertification[];
  certificationsOther: string;
  specializations: CaregiverSpecialization[];
  specializationsOther: string;
  availability: Record<string, { available: boolean; startTime: string; endTime: string }>;
  zipCode: string;
  maxTravelDistance: string;
  comfortableWith: CaregiverComfortWith[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
}

export default function CaregiverOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [agencyName, setAgencyName] = useState<string>('');
  const [step, setStep] = useState<Step>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    languages: [],
    languagesOther: '',
    yearsExperience: '',
    certifications: [],
    certificationsOther: '',
    specializations: [],
    specializationsOther: '',
    availability: DAYS.reduce((acc, day) => ({
      ...acc,
      [day]: { available: false, startTime: '09:00', endTime: '17:00' },
    }), {}),
    zipCode: '',
    maxTravelDistance: '',
    comfortableWith: [],
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/phone-login');
        return;
      }

      setUserId(user.uid);

      // Get user data
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Check if onboarding is required
        if (!userData.caregiverOnboardingRequired) {
          // Already completed, redirect to dashboard
          router.push('/dashboard');
          return;
        }

        setAgencyId(userData.caregiverOnboardingAgencyId);

        // Pre-fill name if available
        if (userData.firstName || userData.lastName) {
          setFormData(prev => ({
            ...prev,
            fullName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          }));
        }

        // Get agency name
        if (userData.caregiverOnboardingAgencyId) {
          const agencyDoc = await getDoc(doc(db, 'agencies', userData.caregiverOnboardingAgencyId));
          if (agencyDoc.exists()) {
            setAgencyName(agencyDoc.data().name || 'Your Agency');
          }
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const validateStep = (currentStep: Step): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 1:
        if (!formData.fullName.trim()) {
          newErrors.fullName = 'Full name is required';
        }
        break;
      case 2:
        if (formData.languages.length === 0) {
          newErrors.languages = 'Select at least one language';
        }
        if (!formData.yearsExperience) {
          newErrors.yearsExperience = 'Years of experience is required';
        }
        if (formData.certifications.length === 0) {
          newErrors.certifications = 'Select at least one certification';
        }
        if (formData.specializations.length === 0) {
          newErrors.specializations = 'Select at least one specialization';
        }
        break;
      case 3:
        const hasAvailability = Object.values(formData.availability).some(d => d.available);
        if (!hasAvailability) {
          newErrors.availability = 'Select at least one day of availability';
        }
        break;
      case 4:
        if (!formData.zipCode.trim() || formData.zipCode.length !== 5) {
          newErrors.zipCode = 'Valid 5-digit ZIP code is required';
        }
        break;
      case 5:
        if (!formData.emergencyContactName.trim()) {
          newErrors.emergencyContactName = 'Emergency contact name is required';
        }
        if (!formData.emergencyContactPhone.trim() || formData.emergencyContactPhone.length !== 10) {
          newErrors.emergencyContactPhone = 'Valid 10-digit phone number is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((step + 1) as Step);
    }
  };

  const handleBack = () => {
    setStep((step - 1) as Step);
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) return;
    if (!userId || !agencyId) return;

    setSaving(true);

    try {
      const response = await fetch('/api/caregiver-profile/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          agencyId,
          profile: {
            fullName: formData.fullName.trim(),
            languages: formData.languages,
            languagesOther: formData.languages.includes('OTHER') ? formData.languagesOther.split(',').map(s => s.trim()).filter(Boolean) : [],
            yearsExperience: parseInt(formData.yearsExperience),
            certifications: formData.certifications,
            certificationsOther: formData.certifications.includes('OTHER') ? formData.certificationsOther.split(',').map(s => s.trim()).filter(Boolean) : [],
            specializations: formData.specializations,
            specializationsOther: formData.specializations.includes('OTHER') ? formData.specializationsOther.split(',').map(s => s.trim()).filter(Boolean) : [],
            availability: Object.fromEntries(
              DAYS.map(day => [
                day,
                {
                  available: formData.availability[day].available,
                  slots: formData.availability[day].available
                    ? [{ start: formData.availability[day].startTime, end: formData.availability[day].endTime }]
                    : undefined,
                },
              ])
            ),
            zipCode: formData.zipCode,
            maxTravelDistance: formData.maxTravelDistance ? parseInt(formData.maxTravelDistance) : undefined,
            comfortableWith: formData.comfortableWith,
            emergencyContact: {
              name: formData.emergencyContactName,
              phone: `+1${formData.emergencyContactPhone}`,
              relationship: formData.emergencyContactRelationship || undefined,
            },
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save profile');
      }

      // Success - redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to save profile:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = <T extends string>(array: T[], item: T): T[] => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const progress = (step / 5) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
            <HeartHandshake className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Complete Your Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome to {agencyName}! Please complete your caregiver profile.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Step {step} of 5</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step === 1 && <><User className="w-5 h-5" /> Basic Information</>}
              {step === 2 && <><Award className="w-5 h-5" /> Professional Background</>}
              {step === 3 && <><Calendar className="w-5 h-5" /> Availability</>}
              {step === 4 && <><MapPin className="w-5 h-5" /> Location & Preferences</>}
              {step === 5 && <><Phone className="w-5 h-5" /> Emergency Contact</>}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Tell us about yourself'}
              {step === 2 && 'Your qualifications and experience'}
              {step === 3 && 'When are you available to work?'}
              {step === 4 && 'Where can you work and what are you comfortable with?'}
              {step === 5 && 'Who should we contact in case of emergency?'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Enter your full name"
                  />
                  {errors.fullName && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.fullName}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Professional Background */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Languages */}
                <div className="space-y-2">
                  <Label>Languages Spoken *</Label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((lang) => (
                      <Badge
                        key={lang.value}
                        variant={formData.languages.includes(lang.value) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setFormData({
                          ...formData,
                          languages: toggleArrayItem(formData.languages, lang.value),
                        })}
                      >
                        {lang.label}
                      </Badge>
                    ))}
                  </div>
                  {formData.languages.includes('OTHER') && (
                    <Input
                      placeholder="Enter other languages (comma-separated)"
                      value={formData.languagesOther}
                      onChange={(e) => setFormData({ ...formData, languagesOther: e.target.value })}
                      className="mt-2"
                    />
                  )}
                  {errors.languages && (
                    <p className="text-sm text-red-500">{errors.languages}</p>
                  )}
                </div>

                {/* Years Experience */}
                <div className="space-y-2">
                  <Label>Years of Experience *</Label>
                  <Select
                    value={formData.yearsExperience}
                    onValueChange={(value) => setFormData({ ...formData, yearsExperience: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select years of experience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Less than 1 year</SelectItem>
                      <SelectItem value="1">1-2 years</SelectItem>
                      <SelectItem value="3">3-5 years</SelectItem>
                      <SelectItem value="6">6-10 years</SelectItem>
                      <SelectItem value="11">10+ years</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.yearsExperience && (
                    <p className="text-sm text-red-500">{errors.yearsExperience}</p>
                  )}
                </div>

                {/* Certifications */}
                <div className="space-y-2">
                  <Label>Certifications *</Label>
                  <div className="flex flex-wrap gap-2">
                    {CERTIFICATIONS.map((cert) => (
                      <Badge
                        key={cert.value}
                        variant={formData.certifications.includes(cert.value) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setFormData({
                          ...formData,
                          certifications: toggleArrayItem(formData.certifications, cert.value),
                        })}
                      >
                        {cert.label}
                      </Badge>
                    ))}
                  </div>
                  {formData.certifications.includes('OTHER') && (
                    <Input
                      placeholder="Enter other certifications (comma-separated)"
                      value={formData.certificationsOther}
                      onChange={(e) => setFormData({ ...formData, certificationsOther: e.target.value })}
                      className="mt-2"
                    />
                  )}
                  {errors.certifications && (
                    <p className="text-sm text-red-500">{errors.certifications}</p>
                  )}
                </div>

                {/* Specializations */}
                <div className="space-y-2">
                  <Label>Specializations *</Label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALIZATIONS.map((spec) => (
                      <Badge
                        key={spec.value}
                        variant={formData.specializations.includes(spec.value) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setFormData({
                          ...formData,
                          specializations: toggleArrayItem(formData.specializations, spec.value),
                        })}
                      >
                        {spec.label}
                      </Badge>
                    ))}
                  </div>
                  {formData.specializations.includes('OTHER') && (
                    <Input
                      placeholder="Enter other specializations (comma-separated)"
                      value={formData.specializationsOther}
                      onChange={(e) => setFormData({ ...formData, specializationsOther: e.target.value })}
                      className="mt-2"
                    />
                  )}
                  {errors.specializations && (
                    <p className="text-sm text-red-500">{errors.specializations}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Availability */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Select the days you&apos;re available to work and set your typical hours.
                </p>
                {errors.availability && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.availability}
                  </p>
                )}
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="flex items-center gap-4 p-3 border rounded-lg"
                  >
                    <Checkbox
                      id={day}
                      checked={formData.availability[day].available}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        availability: {
                          ...formData.availability,
                          [day]: { ...formData.availability[day], available: !!checked },
                        },
                      })}
                    />
                    <Label htmlFor={day} className="flex-1 capitalize cursor-pointer">
                      {day}
                    </Label>
                    {formData.availability[day].available && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={formData.availability[day].startTime}
                          onChange={(e) => setFormData({
                            ...formData,
                            availability: {
                              ...formData.availability,
                              [day]: { ...formData.availability[day], startTime: e.target.value },
                            },
                          })}
                          className="w-28"
                        />
                        <span className="text-gray-500">to</span>
                        <Input
                          type="time"
                          value={formData.availability[day].endTime}
                          onChange={(e) => setFormData({
                            ...formData,
                            availability: {
                              ...formData.availability,
                              [day]: { ...formData.availability[day], endTime: e.target.value },
                            },
                          })}
                          className="w-28"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Step 4: Location & Preferences */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code *</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({
                      ...formData,
                      zipCode: e.target.value.replace(/\D/g, '').slice(0, 5),
                    })}
                    placeholder="Enter your ZIP code"
                    maxLength={5}
                  />
                  {errors.zipCode && (
                    <p className="text-sm text-red-500">{errors.zipCode}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Maximum Travel Distance (optional)</Label>
                  <Select
                    value={formData.maxTravelDistance}
                    onValueChange={(value) => setFormData({ ...formData, maxTravelDistance: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select maximum distance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 miles</SelectItem>
                      <SelectItem value="10">10 miles</SelectItem>
                      <SelectItem value="15">15 miles</SelectItem>
                      <SelectItem value="25">25 miles</SelectItem>
                      <SelectItem value="50">50+ miles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Comfortable With (optional)</Label>
                  <p className="text-sm text-gray-500">Select all that apply</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {COMFORT_OPTIONS.map((option) => (
                      <div key={option.value} className="flex items-center gap-2">
                        <Checkbox
                          id={option.value}
                          checked={formData.comfortableWith.includes(option.value)}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            comfortableWith: checked
                              ? [...formData.comfortableWith, option.value]
                              : formData.comfortableWith.filter(v => v !== option.value),
                          })}
                        />
                        <Label htmlFor={option.value} className="cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Emergency Contact */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyName">Contact Name *</Label>
                  <Input
                    id="emergencyName"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    placeholder="Full name"
                  />
                  {errors.emergencyContactName && (
                    <p className="text-sm text-red-500">{errors.emergencyContactName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Contact Phone *</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 bg-gray-100 dark:bg-gray-800 rounded-l-md border border-r-0">
                      <span className="text-gray-600 dark:text-gray-400">+1</span>
                    </div>
                    <Input
                      id="emergencyPhone"
                      type="tel"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergencyContactPhone: e.target.value.replace(/\D/g, '').slice(0, 10),
                      })}
                      placeholder="(555) 123-4567"
                      className="rounded-l-none"
                    />
                  </div>
                  {errors.emergencyContactPhone && (
                    <p className="text-sm text-red-500">{errors.emergencyContactPhone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyRelationship">Relationship (optional)</Label>
                  <Input
                    id="emergencyRelationship"
                    value={formData.emergencyContactRelationship}
                    onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                    placeholder="e.g., Spouse, Parent, Friend"
                  />
                </div>

                {errors.submit && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {errors.submit}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              {step > 1 ? (
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              {step < 5 ? (
                <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Complete Profile
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
