/**
 * Privacy Filter for Beehive Platform
 * Protects BOTH patient and caregiver personal information until trust is established
 */

export interface PatientInfo {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  doctor_name?: string;
  doctor_phone?: string;
  medical_conditions?: string[];
  photo_url?: string;
}

export interface CaregiverInfo {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  date_of_birth?: string;
  photo_url?: string;
  bio?: string;
  hourly_rate?: number;
}

export interface BookingStatus {
  id: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  caregiver_id: string;
  patient_id: string;
}

/**
 * Filter caregiver information based on booking status
 * Patients can NEVER see caregiver's personal contact details until booking is confirmed
 */
export function filterCaregiverInfo(
  caregiverInfo: CaregiverInfo,
  bookingStatus?: BookingStatus,
  viewerRole: 'patient' | 'caregiver' | 'admin' = 'patient'
): CaregiverInfo {
  // Admins and caregivers themselves can see everything
  if (viewerRole === 'admin' || viewerRole === 'caregiver') {
    return caregiverInfo;
  }

  // For patients, apply strict privacy rules
  const filtered: CaregiverInfo = {
    first_name: caregiverInfo.first_name,
    last_name: caregiverInfo.last_name.charAt(0) + '.', // Show last initial only
    // NEVER show these fields until booking is confirmed
    email: undefined,
    phone: undefined,
    address_line1: undefined,
    address_line2: undefined,
    city: caregiverInfo.city, // Show city for distance calculation
    state: caregiverInfo.state, // Show state for distance calculation
    zip: undefined, // Hide exact ZIP
    date_of_birth: undefined,
    photo_url: caregiverInfo.photo_url, // Allow photo for identification
    bio: caregiverInfo.bio, // Allow bio for selection
    hourly_rate: caregiverInfo.hourly_rate, // Show rate for transparency
  };

  // If booking exists and is confirmed/in-progress/completed
  if (bookingStatus && ['confirmed', 'in_progress', 'completed'].includes(bookingStatus.status)) {
    // Reveal more information after booking confirmation
    filtered.last_name = caregiverInfo.last_name;
    filtered.phone = maskPhone(caregiverInfo.phone); // Show masked phone
    
    // Only show full contact details when booking is in progress
    if (bookingStatus.status === 'in_progress') {
      filtered.phone = caregiverInfo.phone;
      // Still don't reveal home address - caregivers come to patients
    }
  }

  return filtered;
}

/**
 * Filter patient information based on booking status
 * Caregivers can NEVER see email, phone, or address until booking is confirmed
 */
export function filterPatientInfo(
  patientInfo: PatientInfo,
  bookingStatus?: BookingStatus,
  viewerRole: 'patient' | 'caregiver' | 'admin' = 'caregiver'
): PatientInfo {
  // Admins and patients themselves can see everything
  if (viewerRole === 'admin' || viewerRole === 'patient') {
    return patientInfo;
  }

  // For caregivers, apply strict privacy rules
  const filtered: PatientInfo = {
    first_name: patientInfo.first_name,
    last_name: '', // Hide last name initially
    // NEVER show these fields until booking is confirmed
    email: undefined,
    phone: undefined,
    address_line1: undefined,
    address_line2: undefined,
    city: patientInfo.city, // Show city for distance calculation
    state: patientInfo.state, // Show state for distance calculation
    zip: undefined, // Hide exact ZIP
    date_of_birth: undefined,
    emergency_contact_name: undefined,
    emergency_contact_phone: undefined,
    doctor_name: undefined,
    doctor_phone: undefined,
    medical_conditions: patientInfo.medical_conditions, // Show for matching purposes
    photo_url: undefined, // Hide photo initially
  };

  // If booking exists and is confirmed/in-progress/completed
  if (bookingStatus && ['confirmed', 'in_progress', 'completed'].includes(bookingStatus.status)) {
    // Reveal more information after booking confirmation
    filtered.last_name = patientInfo.last_name.charAt(0) + '.'; // Show last initial only
    filtered.phone = maskPhone(patientInfo.phone); // Show masked phone
    filtered.photo_url = patientInfo.photo_url; // Show photo
    
    // Only show full contact details when booking is in progress
    if (bookingStatus.status === 'in_progress') {
      filtered.last_name = patientInfo.last_name;
      filtered.phone = patientInfo.phone;
      filtered.address_line1 = patientInfo.address_line1;
      filtered.address_line2 = patientInfo.address_line2;
      filtered.zip = patientInfo.zip;
      filtered.emergency_contact_name = patientInfo.emergency_contact_name;
      filtered.emergency_contact_phone = patientInfo.emergency_contact_phone;
    }
  }

  return filtered;
}

/**
 * Mask phone number for partial display
 */
function maskPhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  // Show format: (XXX) XXX-XX**
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 8)}**`;
  }
  return undefined;
}

/**
 * Filter message content to prevent sharing personal information
 * BIDIRECTIONAL protection - blocks inappropriate requests from BOTH patients and caregivers
 */
export function filterMessageContent(
  content: string,
  senderRole: 'patient' | 'caregiver'
): {
  filtered: boolean;
  content: string;
  warnings: string[];
  blocked: boolean;
  blockReason?: string;
} {
  const warnings: string[] = [];
  let filtered = false;
  let filteredContent = content;
  let blocked = false;
  let blockReason: string | undefined;

  // Patterns to detect personal information
  const patterns = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
    phone: /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
    phoneKeywords: /\b(phone|mobile|cell|telephone|contact number|whatsapp|text me|call me)\b/gi,
    ssn: /\b(ssn|social security|(\d{3}[-.\s]?\d{2}[-.\s]?\d{4})|(\d{9}))\b/gi,
    ssnAbbreviation: /\b(ssn)\b/gi,
    address: /\b\d+\s+[\w\s]+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|court|ct|place|pl)\b/gi,
    addressKeywords: /\b(address|location|where.*live|residence|home address|zip|zip code|postal code)\b/gi,
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    bankAccount: /\b(account|routing)\s*(number|#|no\.?)[\s:]*\d+\b/gi,
    driverLicense: /\b(driver('?s)?|driving)\s*license\s*(number|#|no\.?)[\s:]*[\w\d]+\b/gi,
    dobAbbreviation: /\b(dob|date of birth|birth date|birthday)\b/gi,
  };

  // Inappropriate personal questions (BOTH DIRECTIONS)
  const inappropriateQuestions = {
    // Financial questions
    financial: /\b(how much|what('?s)?|tell me)\s+(do you|your)\s+(make|earn|income|salary|money|worth|bank|savings|retirement|pension|assets)\b/gi,
    
    // Living situation probing
    living: /\b(do you|are you)\s+(live|living)\s+(alone|by yourself|with anyone|married|single|divorced|widowed)\b/gi,
    
    // Family/relationship probing
    family: /\b(tell me about|who is|what about|do you have)\s+(your)?\s*(family|children|kids|spouse|husband|wife|partner|relatives|next of kin)\b/gi,
    
    // Age/DOB fishing
    age: /\b(how old|what('?s)? your|when were you|your)\s+(age|birthday|birth date|born|DOB)\b/gi,
    
    // Security questions
    security: /\b(what('?s)?|tell me)\s+(your)?\s*(password|pin|code|social|ssn|maiden name|security question)\b/gi,
    
    // Inheritance/estate probing
    estate: /\b(who('?s)?|what about|tell me about)\s+(your)?\s*(will|estate|inheritance|beneficiary|power of attorney|executor)\b/gi,
    
    // Medical history fishing (beyond care needs)
    medical: /\b(what('?s)?|tell me|list)\s+(all)?\s*(your)?\s*(medications|prescriptions|doctors|insurance|medicare|medicaid number)\b/gi,
    
    // Asking for photos
    photos: /\b(send|share|show)\s+(me)?\s*(your|a)?\s*(photo|picture|selfie|pic)\b/gi,
    
    // Trying to meet outside platform
    outside: /\b(can we|let('?s)?|want to|should we)\s+(meet|see each other|get together)\s+(outside|privately|off the app|in person|somewhere else)\b/gi,
  };

  // Check for PII patterns
  if (patterns.email.test(content)) {
    warnings.push('Email addresses should not be shared in messages');
    filteredContent = filteredContent.replace(patterns.email, '[EMAIL REMOVED]');
    filtered = true;
  }

  if (patterns.phone.test(content)) {
    warnings.push('Phone numbers should not be shared in messages');
    filteredContent = filteredContent.replace(patterns.phone, '[PHONE REMOVED]');
    filtered = true;
  }
  
  // Check for phone-related keywords
  if (patterns.phoneKeywords.test(content)) {
    warnings.push('Contact information should be shared through the booking system');
    filteredContent = filteredContent.replace(patterns.phoneKeywords, '[CONTACT INFO REQUEST]');
    filtered = true;
  }

  // Check for SSN patterns including just "SSN" abbreviation
  if (patterns.ssn.test(content) || patterns.ssnAbbreviation.test(content)) {
    blocked = true;
    blockReason = 'Social Security Numbers or SSN requests must NEVER be shared';
    filteredContent = '[MESSAGE BLOCKED: SSN DETECTED]';
    return { filtered: true, content: filteredContent, warnings, blocked, blockReason };
  }
  
  // Check for DOB/birthday requests
  if (patterns.dobAbbreviation.test(content)) {
    warnings.push('Date of birth information should not be requested or shared');
    filteredContent = filteredContent.replace(patterns.dobAbbreviation, '[DOB REQUEST REMOVED]');
    filtered = true;
  }

  if (patterns.creditCard.test(content)) {
    blocked = true;
    blockReason = 'Credit card information must NEVER be shared';
    filteredContent = '[MESSAGE BLOCKED: CREDIT CARD DETECTED]';
    return { filtered: true, content: filteredContent, warnings, blocked, blockReason };
  }

  if (patterns.bankAccount.test(content)) {
    blocked = true;
    blockReason = 'Bank account information must NEVER be shared';
    filteredContent = '[MESSAGE BLOCKED: BANK INFO DETECTED]';
    return { filtered: true, content: filteredContent, warnings, blocked, blockReason };
  }

  if (patterns.driverLicense.test(content)) {
    warnings.push('Do not share driver\'s license information');
    filteredContent = filteredContent.replace(patterns.driverLicense, '[LICENSE INFO REMOVED]');
    filtered = true;
  }

  if (patterns.address.test(content)) {
    warnings.push('Addresses should be shared through the booking system only');
    filteredContent = filteredContent.replace(patterns.address, '[ADDRESS REMOVED]');
    filtered = true;
  }
  
  // Check for address-related keywords
  if (patterns.addressKeywords.test(content)) {
    warnings.push('Location information should be shared through the booking system');
    filteredContent = filteredContent.replace(patterns.addressKeywords, '[LOCATION INFO REQUEST]');
    filtered = true;
  }

  // Check for inappropriate questions from EITHER party
  if (inappropriateQuestions.financial.test(content)) {
    blocked = true;
    blockReason = 'Financial questions are not appropriate. Focus on care needs only.';
    filteredContent = '[MESSAGE BLOCKED: INAPPROPRIATE FINANCIAL QUESTION]';
    return { filtered: true, content: filteredContent, warnings, blocked, blockReason };
  }

  if (inappropriateQuestions.living.test(content)) {
    warnings.push('Questions about living situation should focus on care needs only');
    filteredContent = filteredContent.replace(inappropriateQuestions.living, '[INAPPROPRIATE QUESTION REMOVED]');
    filtered = true;
  }

  if (inappropriateQuestions.family.test(content)) {
    warnings.push('Personal family information should only be shared as relevant to care');
    filteredContent = filteredContent.replace(inappropriateQuestions.family, '[PERSONAL QUESTION REMOVED]');
    filtered = true;
  }

  if (inappropriateQuestions.age.test(content) && senderRole === 'caregiver') {
    warnings.push('Age information is available in the care profile if relevant');
    filteredContent = filteredContent.replace(inappropriateQuestions.age, '[AGE QUESTION REMOVED]');
    filtered = true;
  }

  if (inappropriateQuestions.security.test(content)) {
    blocked = true;
    blockReason = 'NEVER ask for passwords, PINs, or security information';
    filteredContent = '[MESSAGE BLOCKED: SECURITY VIOLATION]';
    return { filtered: true, content: filteredContent, warnings, blocked, blockReason };
  }

  if (inappropriateQuestions.estate.test(content)) {
    blocked = true;
    blockReason = 'Questions about wills, estates, or inheritance are strictly prohibited';
    filteredContent = '[MESSAGE BLOCKED: INAPPROPRIATE ESTATE QUESTION]';
    return { filtered: true, content: filteredContent, warnings, blocked, blockReason };
  }

  if (inappropriateQuestions.medical.test(content) && senderRole === 'caregiver') {
    warnings.push('Medical information should be discussed only as needed for scheduled care');
  }

  if (inappropriateQuestions.photos.test(content)) {
    warnings.push('Photos should only be shared through profile systems');
    filteredContent = filteredContent.replace(inappropriateQuestions.photos, '[PHOTO REQUEST REMOVED]');
    filtered = true;
  }

  if (inappropriateQuestions.outside.test(content)) {
    blocked = true;
    blockReason = 'All meetings must be arranged through the platform booking system';
    filteredContent = '[MESSAGE BLOCKED: ATTEMPT TO MEET OUTSIDE PLATFORM]';
    return { filtered: true, content: filteredContent, warnings, blocked, blockReason };
  }

  // Role-specific checks
  if (senderRole === 'caregiver') {
    const askingForContact = /\b(what('?s)?|can i (have|get)|share|send me|give me)\s+(your)?\s*(phone|number|email|address|contact|whatsapp|facebook|social media)\b/gi;
    if (askingForContact.test(content)) {
      warnings.push('Contact information is shared automatically after booking confirmation');
      filteredContent = filteredContent.replace(askingForContact, '[CONTACT REQUEST REMOVED]');
      filtered = true;
    }
  } else if (senderRole === 'patient') {
    // Patients also shouldn't ask caregivers for personal contact before booking
    const askingCaregiverContact = /\b(what('?s)?|can i (have|get)|share|send me)\s+(your)?\s*(personal|home|cell)?\s*(phone|number|email|address|whatsapp)\b/gi;
    if (askingCaregiverContact.test(content)) {
      warnings.push('Caregiver contact is provided after booking confirmation');
      filteredContent = filteredContent.replace(askingCaregiverContact, '[CONTACT REQUEST REMOVED]');
      filtered = true;
    }
  }

  return {
    filtered,
    content: filtered ? filteredContent : content,
    warnings,
    blocked,
    blockReason,
  };
}

/**
 * Check if caregiver can access a specific feature
 */
export function canCaregiverAccess(
  feature: 'messaging' | 'search' | 'profile_view' | 'booking' | 'schedule',
  verificationStatus: {
    fully_verified: boolean;
    assessment_passed: boolean;
    profile_complete: boolean;
    references_verified: boolean;
    background_check_cleared: boolean;
  }
): {
  allowed: boolean;
  reason?: string;
} {
  // No features available until fully verified
  if (!verificationStatus.fully_verified) {
    return {
      allowed: false,
      reason: 'Complete all onboarding steps to access platform features',
    };
  }

  // Additional feature-specific checks
  switch (feature) {
    case 'messaging':
      // Must be fully verified to message
      return {
        allowed: verificationStatus.fully_verified,
        reason: !verificationStatus.fully_verified ? 
          'Complete verification to message patients' : undefined,
      };

    case 'search':
      // Cannot appear in search results until fully verified
      return {
        allowed: verificationStatus.fully_verified,
        reason: !verificationStatus.fully_verified ? 
          'Complete verification to appear in search results' : undefined,
      };

    case 'booking':
      // Cannot accept bookings until fully verified
      return {
        allowed: verificationStatus.fully_verified,
        reason: !verificationStatus.fully_verified ? 
          'Complete verification to accept bookings' : undefined,
      };

    default:
      return {
        allowed: verificationStatus.fully_verified,
      };
  }
}

/**
 * Generate privacy notice for different contexts
 */
export function getPrivacyNotice(
  context: 'pre_booking' | 'booking_confirmed' | 'booking_active' | 'messaging',
  role: 'patient' | 'caregiver'
): string {
  if (role === 'patient') {
    switch (context) {
      case 'pre_booking':
        return 'Your contact information is protected until you confirm a booking';
      case 'booking_confirmed':
        return 'Limited contact information has been shared with your caregiver';
      case 'booking_active':
        return 'Your caregiver now has access to necessary contact information';
      case 'messaging':
        return 'Never share credit cards, SSN, or passwords in messages';
      default:
        return 'Your privacy is protected';
    }
  } else {
    switch (context) {
      case 'pre_booking':
        return 'Patient contact details available only after booking confirmation';
      case 'booking_confirmed':
        return 'You now have limited access to patient contact information';
      case 'booking_active':
        return 'Full contact information is now available for this booking';
      case 'messaging':
        return 'Do not request personal contact information in messages';
      default:
        return 'Patient privacy must be respected';
    }
  }
}