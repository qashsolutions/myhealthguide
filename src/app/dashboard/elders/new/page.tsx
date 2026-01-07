'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';
import { TrialExpirationGate } from '@/components/auth/TrialExpirationGate';
import { ElderService } from '@/lib/firebase/elders';
import { addEmergencyContact } from '@/lib/firebase/elderHealthProfile';
import { User, Info, ShieldAlert, Phone, Mail, MapPin, Stethoscope, Heart } from 'lucide-react';
import type { Elder, ElderEmergencyContact } from '@/types';

// Check if user is a caregiver (not super admin) in any agency
function isCaregiverOnly(user: any): boolean {
  if (!user?.agencies || user.agencies.length === 0) return false;

  // If user has ANY agency where they are super_admin or admin, they can add elders
  const hasAdminRole = user.agencies.some((agency: any) =>
    agency.role === 'super_admin' || agency.role === 'admin' || agency.role === 'caregiver_admin'
  );

  // User is caregiver-only if they have agencies but no admin role
  return user.agencies.length > 0 && !hasAdminRole;
}

// Common languages for eldercare
const COMMON_LANGUAGES = [
  'English',
  'Spanish',
  'Mandarin',
  'Cantonese',
  'Tagalog',
  'Vietnamese',
  'Korean',
  'Japanese',
  'Hindi',
  'Arabic',
  'Portuguese',
  'Russian',
  'French',
  'German',
  'Italian',
  'Polish',
  'Other',
];

// Top conditions for initial baseline context (AI uses this for pattern analysis)
const COMMON_CONDITIONS = [
  { id: 'diabetes', label: 'Diabetes', icon: '🩸' },
  { id: 'hypertension', label: 'Hypertension', icon: '❤️' },
  { id: 'dementia', label: "Dementia/Alzheimer's", icon: '🧠' },
  { id: 'heart_disease', label: 'Heart Disease', icon: '💗' },
  { id: 'arthritis', label: 'Arthritis', icon: '🦴' },
];

export default function NewElderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    preferredName: '',
    approximateAge: '',
    dateOfBirth: '',
    gender: '' as Elder['gender'] | '',
    primaryLanguage: '',
    additionalLanguages: [] as string[],
    conditions: [] as string[],
    notes: '',
    // Contact Information (mandatory)
    address: '',
    phone: '',
    email: '',
    // Primary Doctor (mandatory)
    doctorName: '',
    doctorPhone: '',
    doctorAddress: '',
    // Emergency Contact (at least 1 mandatory)
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: '',
    emergencyEmail: '',
  });
  const [useExactDOB, setUseExactDOB] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user is a caregiver - they cannot add elders
  const isCaregiver = isCaregiverOnly(user);

  // Show access denied for caregivers
  if (isCaregiver) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-red-800 dark:text-red-200">Access Restricted</CardTitle>
                <CardDescription className="text-red-600 dark:text-red-300">
                  Caregivers cannot add loved ones
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-700 dark:text-red-300">
              Only agency administrators can add new loved ones to the system. This ensures proper
              onboarding and billing setup.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              If you need to care for a new loved one, please contact your agency administrator
              to have them added to the system and assigned to you.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate DOB from approximate age (kept for future use if needed)
  const calculateDOBFromAge = (age: number): Date => {
    const today = new Date();
    const birthYear = today.getFullYear() - age;
    // Use July 1 as default birth date when only age is known
    return new Date(birthYear, 6, 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!user) {
        throw new Error('You must be signed in to add a loved one');
      }

      // Get user's primary group ID
      const groupId = user.groups[0]?.groupId;
      if (!groupId) {
        throw new Error('You must be part of a group to add a loved one');
      }

      const userId = user.id;
      const userRole = user.groups[0]?.role as 'admin' | 'caregiver' | 'member';

      if (!userRole) {
        throw new Error('Unable to determine user role');
      }

      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Name is required');
      }

      if (!useExactDOB && !formData.approximateAge) {
        throw new Error('Please enter approximate age or exact date of birth');
      }

      if (useExactDOB && !formData.dateOfBirth) {
        throw new Error('Please enter date of birth');
      }

      // Validate mandatory contact fields
      if (!formData.address.trim()) {
        throw new Error('Address is required');
      }

      if (!formData.phone.trim()) {
        throw new Error('Phone number is required');
      }

      if (!formData.email.trim()) {
        throw new Error('Email is required');
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        throw new Error('Please enter a valid email address');
      }

      // Validate Primary Doctor
      if (!formData.doctorName.trim()) {
        throw new Error('Primary Doctor name is required');
      }

      if (!formData.doctorPhone.trim()) {
        throw new Error('Primary Doctor phone number is required');
      }

      // Validate Emergency Contact
      if (!formData.emergencyName.trim()) {
        throw new Error('Emergency contact name is required');
      }

      if (!formData.emergencyPhone.trim()) {
        throw new Error('Emergency contact phone number is required');
      }

      if (!formData.emergencyRelationship.trim()) {
        throw new Error('Emergency contact relationship is required');
      }

      // Handle date of birth OR approximate age
      let dateOfBirth: Date | undefined;
      let approximateAge: number | undefined;

      if (useExactDOB && formData.dateOfBirth) {
        dateOfBirth = new Date(formData.dateOfBirth);
      } else {
        const age = parseInt(formData.approximateAge, 10);
        if (isNaN(age) || age < 1 || age > 120) {
          throw new Error('Please enter a valid age between 1 and 120');
        }
        approximateAge = age;
      }

      // Build languages array
      const languages: string[] = [];
      if (formData.primaryLanguage) {
        languages.push(formData.primaryLanguage);
      }
      if (formData.additionalLanguages.length > 0) {
        languages.push(...formData.additionalLanguages.filter(l => l !== formData.primaryLanguage));
      }

      const elderResult = await ElderService.createElder(groupId, userId, userRole, {
        name: formData.name.trim(),
        preferredName: formData.preferredName.trim() || undefined,
        groupId,
        dateOfBirth,
        approximateAge,
        gender: formData.gender || undefined,
        languages: languages.length > 0 ? languages : undefined,
        knownConditions: formData.conditions.length > 0 ? formData.conditions : undefined,
        notes: formData.notes.trim(),
        createdAt: new Date(),
      });

      // Get the elder ID from the result
      const elderId = elderResult.id;

      if (elderId) {
        // Create primary contact (elder's own info) - marks as primary for display in tables
        await addEmergencyContact({
          elderId,
          groupId,
          name: formData.name.trim(),
          relationship: 'Self',
          type: 'family',
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          address: formData.address.trim(),
          isPrimary: true,
          createdBy: userId,
        });

        // Create Primary Doctor contact
        await addEmergencyContact({
          elderId,
          groupId,
          name: formData.doctorName.trim(),
          relationship: 'Primary Doctor',
          type: 'doctor',
          phone: formData.doctorPhone.trim(),
          address: formData.doctorAddress.trim() || undefined,
          isPrimary: false,
          createdBy: userId,
        });

        // Create Emergency Contact (Next of Kin)
        await addEmergencyContact({
          elderId,
          groupId,
          name: formData.emergencyName.trim(),
          relationship: formData.emergencyRelationship.trim(),
          type: 'family',
          phone: formData.emergencyPhone.trim(),
          email: formData.emergencyEmail.trim() || undefined,
          isPrimary: false,
          createdBy: userId,
        });
      }

      router.push('/dashboard/elders');
    } catch (err: any) {
      console.error('Error creating elder:', err);
      setError(err.message || 'Failed to add loved one. Please try again.');
      setLoading(false);
    }
  };

  const handleLanguageToggle = (language: string) => {
    setFormData(prev => {
      const current = prev.additionalLanguages;
      if (current.includes(language)) {
        return { ...prev, additionalLanguages: current.filter(l => l !== language) };
      } else {
        return { ...prev, additionalLanguages: [...current, language] };
      }
    });
  };

  const handleConditionToggle = (conditionId: string) => {
    setFormData(prev => {
      const current = prev.conditions;
      if (current.includes(conditionId)) {
        return { ...prev, conditions: current.filter(c => c !== conditionId) };
      } else {
        return { ...prev, conditions: [...current, conditionId] };
      }
    });
  };

  return (
    <TrialExpirationGate featureName="elder profiles">
      <EmailVerificationGate featureName="elder profiles">
        <div className="max-w-2xl mx-auto p-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>Add New Loved One</CardTitle>
                  <CardDescription>Enter the basic information for the person you&apos;ll be caring for</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Basic Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="name"
                        placeholder="e.g., John Smith"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                        className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="preferredName">Preferred Name / Nickname</Label>
                      <Input
                        id="preferredName"
                        placeholder="e.g., Johnny, Grandpa"
                        value={formData.preferredName}
                        onChange={(e) => setFormData({...formData, preferredName: e.target.value})}
                        className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                    </div>
                  </div>

                  {/* Age / DOB Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Age <span className="text-red-500">*</span></Label>
                      <button
                        type="button"
                        onClick={() => setUseExactDOB(!useExactDOB)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {useExactDOB ? 'Use approximate age instead' : 'I know the exact date of birth'}
                      </button>
                    </div>

                    {useExactDOB ? (
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                        required={useExactDOB}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          id="approximateAge"
                          type="number"
                          min="1"
                          max="120"
                          placeholder="e.g., 78"
                          value={formData.approximateAge}
                          onChange={(e) => setFormData({...formData, approximateAge: e.target.value})}
                          required={!useExactDOB}
                          className="w-32 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                        <span className="text-sm text-gray-500 dark:text-gray-400">years old</span>
                      </div>
                    )}

                    {!useExactDOB && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Approximate age is fine if exact birth date is unknown
                      </p>
                    )}
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={formData.gender || ''}
                      onValueChange={(v) => setFormData({...formData, gender: v as Elder['gender']})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="space-y-4 pt-4 border-t dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Contact Information
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
                    <Input
                      id="address"
                      placeholder="e.g., 123 Main St, Apt 4B, City, State 12345"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      required
                      className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="e.g., (555) 123-4567"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          required
                          className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="e.g., john@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          required
                          className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary Doctor Section */}
                <div className="space-y-4 pt-4 border-t dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Primary Doctor
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="doctorName">Doctor Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="doctorName"
                        placeholder="e.g., Dr. Jane Smith"
                        value={formData.doctorName}
                        onChange={(e) => setFormData({...formData, doctorName: e.target.value})}
                        required
                        className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="doctorPhone">Doctor Phone <span className="text-red-500">*</span></Label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <Input
                          id="doctorPhone"
                          type="tel"
                          placeholder="e.g., (555) 987-6543"
                          value={formData.doctorPhone}
                          onChange={(e) => setFormData({...formData, doctorPhone: e.target.value})}
                          required
                          className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doctorAddress">Doctor/Clinic Address</Label>
                    <Input
                      id="doctorAddress"
                      placeholder="e.g., 456 Medical Center Dr, Suite 100"
                      value={formData.doctorAddress}
                      onChange={(e) => setFormData({...formData, doctorAddress: e.target.value})}
                      className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>
                </div>

                {/* Emergency Contact Section */}
                <div className="space-y-4 pt-4 border-t dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Emergency Contact (Next of Kin)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyName">Contact Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="emergencyName"
                        placeholder="e.g., Mary Smith"
                        value={formData.emergencyName}
                        onChange={(e) => setFormData({...formData, emergencyName: e.target.value})}
                        required
                        className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergencyRelationship">Relationship <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.emergencyRelationship || ''}
                        onValueChange={(v) => setFormData({...formData, emergencyRelationship: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Spouse">Spouse</SelectItem>
                          <SelectItem value="Son">Son</SelectItem>
                          <SelectItem value="Daughter">Daughter</SelectItem>
                          <SelectItem value="Sibling">Sibling</SelectItem>
                          <SelectItem value="Grandchild">Grandchild</SelectItem>
                          <SelectItem value="Nephew/Niece">Nephew/Niece</SelectItem>
                          <SelectItem value="Friend">Friend</SelectItem>
                          <SelectItem value="Neighbor">Neighbor</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyPhone">Contact Phone <span className="text-red-500">*</span></Label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <Input
                          id="emergencyPhone"
                          type="tel"
                          placeholder="e.g., (555) 111-2222"
                          value={formData.emergencyPhone}
                          onChange={(e) => setFormData({...formData, emergencyPhone: e.target.value})}
                          required
                          className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergencyEmail">Contact Email</Label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <Input
                          id="emergencyEmail"
                          type="email"
                          placeholder="e.g., mary@email.com (optional)"
                          value={formData.emergencyEmail}
                          onChange={(e) => setFormData({...formData, emergencyEmail: e.target.value})}
                          className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Language Section */}
                <div className="space-y-4 pt-4 border-t dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Language Preferences
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="primaryLanguage">Primary Language</Label>
                    <Select
                      value={formData.primaryLanguage || ''}
                      onValueChange={(v) => setFormData({...formData, primaryLanguage: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select primary language" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_LANGUAGES.map(lang => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.primaryLanguage && (
                    <div className="space-y-2">
                      <Label>Additional Languages Spoken</Label>
                      <div className="flex flex-wrap gap-2">
                        {COMMON_LANGUAGES.filter(l => l !== formData.primaryLanguage).slice(0, 8).map(lang => (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => handleLanguageToggle(lang)}
                            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                              formData.additionalLanguages.includes(lang)
                                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                            }`}
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Known Conditions Section */}
                <div className="space-y-4 pt-4 border-t dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Known Conditions
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                    Select any conditions for baseline context (helps AI provide relevant observations)
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {COMMON_CONDITIONS.map(condition => (
                      <button
                        key={condition.id}
                        type="button"
                        onClick={() => handleConditionToggle(condition.id)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors text-left ${
                          formData.conditions.includes(condition.id)
                            ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500 text-purple-700 dark:text-purple-300'
                            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                        }`}
                      >
                        <span>{condition.icon}</span>
                        <span>{condition.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes Section */}
                <div className="space-y-4 pt-4 border-t dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Additional Notes
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Important Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any other important information (allergies, care preferences, etc.)"
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      You can add detailed health information later in the Health Profile section
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Adding Loved One...' : 'Add Loved One'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </EmailVerificationGate>
    </TrialExpirationGate>
  );
}
