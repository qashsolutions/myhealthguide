import { supabase } from '@/lib/supabase';
import { generateMatchScore } from './ai-client';

/**
 * AI-Powered Matching System for Beehive
 * Matches patients with caregivers based on multiple factors
 */

export interface MatchingCriteria {
  patientId: string;
  languages?: string[];
  location?: {
    latitude: number;
    longitude: number;
    radiusMiles?: number;
  };
  careNeeds?: string[];
  schedule?: string[];
  maxHourlyRate?: number;
  minimumRating?: number;
  experienceYears?: number;
}

export interface CaregiverMatch {
  caregiverId: string;
  profile: any;
  matchScore: number;
  matchFactors: {
    languageMatch: number;
    locationMatch: number;
    skillsMatch: number;
    availabilityMatch: number;
    experienceMatch: number;
    trustScore: number;
  };
  distance?: number;
  explanation: string;
  highlighted: boolean;
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find matching caregivers for a patient
 */
export async function findMatches(
  criteria: MatchingCriteria
): Promise<CaregiverMatch[]> {
  try {
    // Build query for available caregivers
    let query = supabase
      .from('caregiver_profiles')
      .select(`
        *,
        users!caregiver_profiles_user_id_fkey (
          email,
          phone,
          is_active
        )
      `)
      .eq('verification_status', 'verified')
      .in('background_check_status', ['clear', 'consider']);

    // Apply filters
    if (criteria.maxHourlyRate) {
      query = query.lte('hourly_rate', criteria.maxHourlyRate);
    }

    if (criteria.experienceYears) {
      query = query.gte('years_experience', criteria.experienceYears);
    }

    if (criteria.minimumRating) {
      query = query.gte('average_rating', criteria.minimumRating);
    }

    const { data: caregivers, error } = await query;

    if (error) throw error;
    if (!caregivers || caregivers.length === 0) {
      return [];
    }

    // Load patient profile for matching
    const { data: patientProfile } = await supabase
      .from('patient_profiles')
      .select('*')
      .eq('user_id', criteria.patientId)
      .single();

    // Calculate match scores for each caregiver
    const matches: CaregiverMatch[] = await Promise.all(
      caregivers.map(async (caregiver) => {
        const matchFactors = {
          languageMatch: 0,
          locationMatch: 0,
          skillsMatch: 0,
          availabilityMatch: 0,
          experienceMatch: 0,
          trustScore: 0,
        };

        // 1. Language Match (40% weight - critical for communication)
        if (criteria.languages && caregiver.languages) {
          const commonLanguages = criteria.languages.filter((lang) =>
            caregiver.languages.includes(lang)
          );
          matchFactors.languageMatch = 
            (commonLanguages.length / criteria.languages.length) * 100;
        }

        // 2. Location Match (20% weight)
        let distance = null;
        if (criteria.location && caregiver.location_lat && caregiver.location_lng) {
          distance = calculateDistance(
            criteria.location.latitude,
            criteria.location.longitude,
            caregiver.location_lat,
            caregiver.location_lng
          );
          
          const maxRadius = criteria.location.radiusMiles || 25;
          if (distance <= maxRadius) {
            matchFactors.locationMatch = 
              ((maxRadius - distance) / maxRadius) * 100;
          }
        }

        // 3. Skills Match (15% weight)
        if (criteria.careNeeds && caregiver.specializations) {
          const matchingSkills = criteria.careNeeds.filter((need) =>
            caregiver.specializations.includes(need)
          );
          matchFactors.skillsMatch = 
            criteria.careNeeds.length > 0
              ? (matchingSkills.length / criteria.careNeeds.length) * 100
              : 50;
        }

        // 4. Availability Match (15% weight)
        if (criteria.schedule && caregiver.availability) {
          const matchingSlots = criteria.schedule.filter((slot) =>
            caregiver.availability.includes(slot)
          );
          matchFactors.availabilityMatch = 
            criteria.schedule.length > 0
              ? (matchingSlots.length / criteria.schedule.length) * 100
              : 50;
        }

        // 5. Experience Match (10% weight) - using total_hours_worked instead
        if (caregiver.total_hours_worked) {
          if (caregiver.total_hours_worked >= 2000) { // ~1 year full time
            matchFactors.experienceMatch = 100;
          } else if (caregiver.total_hours_worked >= 1000) {
            matchFactors.experienceMatch = 80;
          } else if (caregiver.total_hours_worked >= 500) {
            matchFactors.experienceMatch = 60;
          } else {
            matchFactors.experienceMatch = 40;
          }
        }

        // 6. Trust Score (bonus points) - using overall_trust_score field
        if (caregiver.overall_trust_score) {
          matchFactors.trustScore = (caregiver.overall_trust_score * 100) || 0;
        }

        // Calculate weighted overall score
        const overallScore = 
          (matchFactors.languageMatch * 0.4) +
          (matchFactors.locationMatch * 0.2) +
          (matchFactors.skillsMatch * 0.15) +
          (matchFactors.availabilityMatch * 0.15) +
          (matchFactors.experienceMatch * 0.1) +
          (matchFactors.trustScore * 0.1); // Bonus weight

        // Use AI for additional insights if score is borderline
        let aiExplanation = '';
        if (overallScore >= 60) {
          try {
            const aiMatch = await generateMatchScore(
              {
                ...caregiver,
                matchFactors,
              },
              {
                ...patientProfile,
                criteria,
              }
            );
            aiExplanation = aiMatch.explanation;
          } catch (err) {
            console.error('AI match scoring failed:', err);
            aiExplanation = generateBasicExplanation(matchFactors, caregiver);
          }
        } else {
          aiExplanation = generateBasicExplanation(matchFactors, caregiver);
        }

        return {
          caregiverId: caregiver.user_id,
          profile: caregiver,
          matchScore: Math.round(overallScore),
          matchFactors,
          distance,
          explanation: aiExplanation,
          highlighted: overallScore >= 85, // Highlight top matches
        };
      })
    );

    // Sort by match score (highest first)
    matches.sort((a, b) => b.matchScore - a.matchScore);

    // Return top matches (limit to 20 for performance)
    return matches.slice(0, 20);
  } catch (error) {
    console.error('Matching error:', error);
    throw new Error('Failed to find matches');
  }
}

/**
 * Generate basic explanation without AI
 */
function generateBasicExplanation(
  factors: CaregiverMatch['matchFactors'],
  caregiver: any
): string {
  const strengths = [];

  if (factors.languageMatch >= 80) {
    strengths.push('excellent language compatibility');
  }
  if (factors.locationMatch >= 80) {
    strengths.push('very close location');
  } else if (factors.locationMatch >= 60) {
    strengths.push('convenient location');
  }
  if (factors.skillsMatch >= 80) {
    strengths.push('highly relevant experience');
  }
  if (factors.trustScore >= 85) {
    strengths.push('outstanding trust score');
  }
  if (caregiver.total_hours_worked >= 1000) {
    strengths.push(`${Math.round(caregiver.total_hours_worked / 2000)} years equivalent experience`);
  }

  if (strengths.length === 0) {
    return 'Available caregiver in your area.';
  }

  return `Strong match with ${strengths.join(', ')}.`;
}

/**
 * Get a single caregiver's detailed profile for booking
 */
export async function getCaregiverProfile(caregiverId: string) {
  try {
    const { data, error } = await supabase
      .from('caregiver_profiles')
      .select(`
        *,
        users!caregiver_profiles_user_id_fkey (
          email,
          phone,
          is_active
        ),
        "references" (
          id,
          reference_name,
          relationship,
          is_verified,
          rating,
          comments
        ),
        bookings (
          id,
          patient_rating,
          patient_notes,
          booking_date,
          status
        )
      `)
      .eq('user_id', caregiverId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching caregiver profile:', error);
    throw new Error('Failed to load caregiver profile');
  }
}

/**
 * Save a match for later reference
 */
export async function saveMatch(
  patientId: string,
  caregiverId: string,
  matchScore: number
) {
  try {
    const { error } = await supabase.from('saved_matches').insert({
      patient_id: patientId,
      caregiver_id: caregiverId,
      match_score: matchScore,
      saved_at: new Date().toISOString(),
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving match:', error);
    throw new Error('Failed to save match');
  }
}

/**
 * Get saved matches for a patient
 */
export async function getSavedMatches(patientId: string) {
  try {
    const { data, error } = await supabase
      .from('saved_matches')
      .select(`
        *,
        caregiver:caregiver_profiles!saved_matches_caregiver_id_fkey (
          *,
          trust_scores (
            overall_score
          )
        )
      `)
      .eq('patient_id', patientId)
      .order('saved_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching saved matches:', error);
    return [];
  }
}