import { createClient } from '@supabase/supabase-js';

// Supabase configuration for Beehive
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uwayvfgupsjdnyymkcmw.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Client for browser operations (uses RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We're using Firebase for auth
  },
});

// Server client factory (for API routes - uses service role)
export const getServiceSupabase = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  
  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not set');
    throw new Error('Supabase URL is not configured');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

// Database types (will be generated from Supabase later)
export interface User {
  id: string;
  email: string;
  phone: string;
  role: 'patient' | 'caregiver' | 'admin';
  firebase_uid: string;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
  email_verified: boolean;
  phone_verified: boolean;
}

export interface CaregiverProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  nationality?: string;
  photo_url?: string;
  video_intro_url?: string;
  bio?: string;
  current_address_line1: string;
  current_address_line2?: string;
  current_city: string;
  current_state: string;
  current_zip: string;
  verification_status: 'pending' | 'verified' | 'suspended';
  background_check_status: 'pending' | 'clear' | 'consider' | 'fail';
  safety_score?: number;
  empathy_score?: number;
  integrity_score?: number;
  knowledge_score?: number;
  overall_trust_score?: number;
  hourly_rate?: number;
  service_radius_miles: number;
  languages?: string[];
  skills?: string[];
  certifications?: string[];
  total_hours_worked: number;
  completion_rate: number;
  average_rating?: number;
  location_lat?: number;
  location_lng?: number;
}

export interface PatientProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  photo_url?: string;
  care_level?: 'light' | 'moderate' | 'heavy';
  mobility_level?: string;
  cognitive_status?: string;
  medical_conditions?: string[];
  care_needs?: string[];
  preferred_languages?: string[];
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship?: string;
  subscription_status: 'inactive' | 'trial' | 'active' | 'past_due' | 'cancelled';
  stripe_customer_id?: string;
  location_lat?: number;
  location_lng?: number;
  address_line1: string;
  city: string;
  state: string;
  zip: string;
}

export interface AssessmentScenario {
  scenario_code: string;
  scenario_category: string;
  scenario_title: string;
  scenario_prompt: string;
  response_options: any;
  response_scores: any;
  tests_for: string[];
  automatic_fail_responses: number[];
  is_active: boolean;
}

export interface PsychometricAssessment {
  id: string;
  caregiver_id: string;
  assessment_version: string;
  started_at: string;
  completed_at?: string;
  scenario_responses: any;
  integrity_score?: number;
  empathy_score?: number;
  impulse_control_score?: number;
  overall_risk_level?: 'very_low' | 'low' | 'moderate' | 'high' | 'unacceptable';
  risk_factors?: string[];
  ai_confidence_score?: number;
  ai_red_flags?: string[];
}