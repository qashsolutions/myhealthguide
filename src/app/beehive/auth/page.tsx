'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useBeehiveAuth } from '@/contexts/BeehiveAuthContext';
import { AlertCircle, CheckCircle, Users, Heart, Share2, ChevronRight } from 'lucide-react';

export default function BeehiveAuthPage() {
  const router = useRouter();
  const { signUp, signIn } = useBeehiveAuth();
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  // Form data with extended fields
  const [formData, setFormData] = useState({
    // Basic fields
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    zipCode: '',
    phone: '',

    // Care Seeker preferences
    caregiverGenderPreference: '',
    languagePreferences: [] as string[],
    serviceTypesNeeded: [] as string[],
    scheduleNeeds: '',
    budgetRange: '',

    // Caregiver professional info
    yearsOfExperience: '',
    certifications: [] as string[],
    servicesOffered: [] as string[],
    languagesSpoken: [] as string[],
    availability: [] as string[],
    hourlyRate: '',
    backgroundCheckStatus: false,
    genderIdentity: '',
  });

  const roleCards = [
    {
      value: 'care_seeker',
      icon: <Users className="w-8 h-8 text-blue-600" />,
      title: 'Care Seeker',
      description: 'I need care services for myself or a loved one',
      color: 'border-blue-200 hover:border-blue-400 bg-blue-50/50'
    },
    {
      value: 'caregiver',
      icon: <Heart className="w-8 h-8 text-green-600" />,
      title: 'Caregiver',
      description: 'I provide professional care services',
      color: 'border-green-200 hover:border-green-400 bg-green-50/50'
    },
    {
      value: 'recommender',
      icon: <Share2 className="w-8 h-8 text-purple-600" />,
      title: 'Recommender',
      description: 'I want to refer trusted caregivers',
      color: 'border-purple-200 hover:border-purple-400 bg-purple-50/50'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Step 1 validation
        if (currentStep === 1) {
          if (!formData.role) {
            setError('Please select your role');
            setLoading(false);
            return;
          }
          // Move to step 2
          setCurrentStep(2);
          setLoading(false);
          return;
        }

        // Step 2 validation and submission
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
          setError('Please fill in all required fields');
          setLoading(false);
          return;
        }

        // Validate ZIP code for caregivers
        if (formData.role === 'caregiver' && !formData.zipCode) {
          setError('ZIP code is required for caregivers');
          setLoading(false);
          return;
        }

        // Sign up with Firebase
        await signUp(formData.email, formData.password, formData);

        setSuccess('Account created! Please check your email to verify your account.');

        // Redirect after 3 seconds
        setTimeout(() => {
          router.push('/beehive');
        }, 3000);
      } else {
        // Sign in
        if (!formData.email || !formData.password) {
          setError('Please enter your email and password');
          setLoading(false);
          return;
        }

        await signIn(formData.email, formData.password);
        router.push('/beehive');
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Please input the correct email/password');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleMultiSelect = (field: string, value: string) => {
    setFormData(prev => {
      const currentValue = prev[field as keyof typeof formData];
      if (Array.isArray(currentValue)) {
        return {
          ...prev,
          [field]: currentValue.includes(value)
            ? currentValue.filter(v => v !== value)
            : [...currentValue, value]
        };
      }
      return prev;
    });
  };

  const renderRoleSpecificFields = () => {
    if (formData.role === 'care_seeker') {
      return (
        <>
          <div className="space-y-4">
            <div className="border-b border-elder-border pb-2">
              <h3 className="text-elder-lg font-semibold text-elder-text">
                Caregiver Gender Preference
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {['No Preference', 'Male', 'Female', 'Non-binary'].map(option => (
                <label
                  key={option}
                  className={`relative flex items-center p-5 border-2 rounded-elder cursor-pointer transition-all ${
                    formData.caregiverGenderPreference === option
                      ? 'border-primary-500 bg-primary-50 shadow-sm'
                      : 'border-elder-border hover:border-gray-300 bg-white hover:shadow-sm'
                  }`}
                >
                  <input
                    type="radio"
                    name="caregiverGenderPreference"
                    value={option}
                    checked={formData.caregiverGenderPreference === option}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <span className="text-elder-base font-medium text-elder-text">{option}</span>
                  {formData.caregiverGenderPreference === option && (
                    <CheckCircle className="absolute top-4 right-4 w-5 h-5 text-primary-600" />
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-b border-elder-border pb-2">
              <h3 className="text-elder-lg font-semibold text-elder-text">
                Services Needed
              </h3>
              <p className="text-elder-text-secondary text-sm mt-1">Select all that apply</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {['Companionship', 'Personal Care', 'Meal Prep', 'Transportation', 'Medication Management', 'Housekeeping'].map(service => (
                <label
                  key={service}
                  className={`relative flex items-center p-5 border-2 rounded-elder cursor-pointer transition-all ${
                    formData.serviceTypesNeeded.includes(service)
                      ? 'border-health-safe bg-health-safe-bg shadow-sm'
                      : 'border-elder-border hover:border-gray-300 bg-white hover:shadow-sm'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.serviceTypesNeeded.includes(service)}
                    onChange={() => handleMultiSelect('serviceTypesNeeded', service)}
                    className="sr-only"
                  />
                  <span className="text-elder-base font-medium text-elder-text">{service}</span>
                  {formData.serviceTypesNeeded.includes(service) && (
                    <CheckCircle className="absolute top-4 right-4 w-5 h-5 text-health-safe" />
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-b border-elder-border pb-2">
              <h3 className="text-elder-lg font-semibold text-elder-text">
                Budget Range
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '15-25', label: '$15-25/hour' },
                { value: '25-35', label: '$25-35/hour' },
                { value: '35-50', label: '$35-50/hour' },
                { value: '50+', label: '$50+/hour' }
              ].map(option => (
                <label
                  key={option.value}
                  className={`relative flex items-center p-5 border-2 rounded-elder cursor-pointer transition-all ${
                    formData.budgetRange === option.value
                      ? 'border-primary-500 bg-primary-50 shadow-sm'
                      : 'border-elder-border hover:border-gray-300 bg-white hover:shadow-sm'
                  }`}
                >
                  <input
                    type="radio"
                    name="budgetRange"
                    value={option.value}
                    checked={formData.budgetRange === option.value}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <span className="text-elder-base font-medium text-elder-text">{option.label}</span>
                  {formData.budgetRange === option.value && (
                    <CheckCircle className="absolute top-4 right-4 w-5 h-5 text-primary-600" />
                  )}
                </label>
              ))}
            </div>
          </div>
        </>
      );
    }

    if (formData.role === 'caregiver') {
      return (
        <>
          <input
            type="text"
            name="zipCode"
            placeholder="ZIP Code * (Service Area)"
            value={formData.zipCode}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            pattern="[0-9]{5}"
            maxLength={5}
            required
          />

          <select
            name="yearsOfExperience"
            value={formData.yearsOfExperience}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Years of Experience *</option>
            <option value="0-1">Less than 1 year</option>
            <option value="1-3">1-3 years</option>
            <option value="3-5">3-5 years</option>
            <option value="5-10">5-10 years</option>
            <option value="10+">10+ years</option>
          </select>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Services Offered (select all that apply)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['Companionship', 'Personal Care', 'Meal Prep', 'Transportation', 'Medication Management', 'Housekeeping', 'Specialized Care'].map(service => (
                <label key={service} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.servicesOffered.includes(service)}
                    onChange={() => handleMultiSelect('servicesOffered', service)}
                    className="mr-2"
                  />
                  <span className="text-sm">{service}</span>
                </label>
              ))}
            </div>
          </div>

          <input
            type="text"
            name="hourlyRate"
            placeholder="Hourly Rate (e.g., 25)"
            value={formData.hourlyRate}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            pattern="[0-9]+"
          />

          <label className="flex items-center">
            <input
              type="checkbox"
              name="backgroundCheckStatus"
              checked={formData.backgroundCheckStatus}
              onChange={handleInputChange}
              className="mr-2"
            />
            <span className="text-sm">I have completed a background check</span>
          </label>
        </>
      );
    }

    // Recommender - minimal fields
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {isSignUp ? 'Join Beehive' : 'Welcome Back'}
            </h1>
            <p className="text-xl text-gray-600">
              {isSignUp
                ? currentStep === 1
                  ? 'First, tell us who you are'
                  : 'Complete your profile'
                : 'Sign in to your Beehive account'
              }
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Toggle Tabs */}
            <div className="flex mb-8 border-b">
              <button
                onClick={() => {
                  setIsSignUp(true);
                  setCurrentStep(1);
                  setError('');
                  setSuccess('');
                }}
                className={`flex-1 pb-4 text-lg font-medium transition-colors ${
                  isSignUp
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign Up
              </button>
              <button
                onClick={() => {
                  setIsSignUp(false);
                  setError('');
                  setSuccess('');
                }}
                className={`flex-1 pb-4 text-lg font-medium transition-colors ${
                  !isSignUp
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign In
              </button>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <span className="text-red-700">{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-green-700">{success}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp ? (
                <>
                  {currentStep === 1 ? (
                    // Step 1: Role Selection
                    <div className="space-y-4">
                      <div className="grid gap-4">
                        {roleCards.map(role => (
                          <label
                            key={role.value}
                            className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              formData.role === role.value
                                ? `${role.color} ring-2 ring-offset-2 ${role.value === 'care_seeker' ? 'ring-blue-500' : role.value === 'caregiver' ? 'ring-green-500' : 'ring-purple-500'}`
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="role"
                              value={role.value}
                              checked={formData.role === role.value}
                              onChange={handleInputChange}
                              className="sr-only"
                            />
                            <div className="flex items-start">
                              <div className="flex-shrink-0 mt-1">{role.icon}</div>
                              <div className="ml-4">
                                <h4 className="text-lg font-medium text-gray-900">{role.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                              </div>
                            </div>
                            {formData.role === role.value && (
                              <CheckCircle className="absolute top-4 right-4 w-6 h-6 text-green-600" />
                            )}
                          </label>
                        ))}
                      </div>

                      <Button
                        type="submit"
                        disabled={!formData.role || loading}
                        className="w-full flex items-center justify-center gap-2"
                      >
                        Continue
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    // Step 2: Account Details
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          name="firstName"
                          placeholder="First Name *"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="input-base"
                          required
                        />
                        <input
                          type="text"
                          name="lastName"
                          placeholder="Last Name *"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className="input-base"
                          required
                        />
                      </div>

                      <input
                        type="email"
                        name="email"
                        placeholder="Email Address *"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="input-base"
                        required
                      />

                      <input
                        type="tel"
                        name="phone"
                        placeholder="Phone Number (optional)"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="input-base"
                      />

                      {formData.role !== 'caregiver' && (
                        <input
                          type="text"
                          name="zipCode"
                          placeholder="ZIP Code (optional)"
                          value={formData.zipCode}
                          onChange={handleInputChange}
                          className="input-base"
                          pattern="[0-9]{5}"
                          maxLength={5}
                        />
                      )}

                      <input
                        type="password"
                        name="password"
                        placeholder="Password * (min 6 characters)"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="input-base"
                        required
                        minLength={6}
                      />

                      <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm Password *"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="input-base"
                        required
                      />

                      {/* Role-specific fields */}
                      {renderRoleSpecificFields()}

                      <div className="text-sm text-gray-600 text-left">
                        By signing up, you agree to our Terms of Service and Privacy Policy
                      </div>

                      <div className="flex gap-4">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setCurrentStep(1)}
                          className="flex-1"
                        >
                          ← Back
                        </Button>
                        <Button
                          type="submit"
                          disabled={loading}
                          className="flex-1"
                        >
                          {loading ? 'Creating Account...' : 'Sign Up'}
                        </Button>
                      </div>

                      <p className="text-sm text-gray-600 text-center">
                        Are you a caregiver?{' '}
                        <button
                          type="button"
                          onClick={() => router.push('/beehive/refer')}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          Get Referred
                        </button>
                      </p>
                    </>
                  )}
                </>
              ) : (
                // Sign In Form
                <>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input-base"
                    required
                  />
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="input-base"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>

                  <p className="text-sm text-gray-600 text-center">
                    <button type="button" className="text-blue-600 hover:underline">
                      Forgot Password?
                    </button>
                  </p>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}