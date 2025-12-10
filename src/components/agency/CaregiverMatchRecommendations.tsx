'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  User,
  Languages,
  Award,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface MatchBreakdown {
  languageMatch: number;
  specializationMatch: number;
  locationMatch: number;
  availabilityMatch: number;
  preferenceMatch: number;
}

interface CaregiverMatch {
  caregiverId: string;
  caregiverName: string;
  matchScore: number;
  matchLabel: { label: string; color: string };
  matchBreakdown: MatchBreakdown;
  matchReasons: string[];
  warnings?: string[];
  currentElderCount: number;
  canAssign: boolean;
  profile: {
    languages: string[];
    yearsExperience: number;
    certifications: string[];
    specializations: string[];
    zipCode: string;
  };
}

interface CaregiverMatchRecommendationsProps {
  agencyId: string;
  elderId: string;
  elderName: string;
  superAdminId: string;
  onSelectCaregiver: (caregiverId: string) => void;
  selectedCaregiverId?: string;
}

export function CaregiverMatchRecommendations({
  agencyId,
  elderId,
  elderName,
  superAdminId,
  onSelectCaregiver,
  selectedCaregiverId,
}: CaregiverMatchRecommendationsProps) {
  const [matches, setMatches] = useState<CaregiverMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  useEffect(() => {
    if (elderId) {
      fetchMatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elderId, agencyId]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/caregiver-matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId,
          elderId,
          superAdminId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get recommendations');
      }

      setMatches(data.matches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 60) return 'bg-blue-100 dark:bg-blue-900/30';
    if (score >= 40) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  const formatCertification = (cert: string) => {
    return cert.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
        <p className="text-sm text-gray-500 mt-2">Getting AI recommendations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
        <User className="w-8 h-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No caregivers available. Invite caregivers first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Sparkles className="w-4 h-4 text-purple-500" />
        <span>AI Recommendations for {elderName}</span>
      </div>

      {matches.map((match, index) => (
        <Collapsible
          key={match.caregiverId}
          open={expandedMatch === match.caregiverId}
          onOpenChange={(open) => setExpandedMatch(open ? match.caregiverId : null)}
        >
          <div
            className={`border rounded-lg overflow-hidden transition-all ${
              selectedCaregiverId === match.caregiverId
                ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div
              className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                !match.canAssign ? 'opacity-60' : ''
              }`}
              onClick={() => {
                if (match.canAssign) {
                  onSelectCaregiver(match.caregiverId);
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Rank badge */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index === 0
                        ? 'bg-yellow-100 text-yellow-700'
                        : index === 1
                        ? 'bg-gray-100 text-gray-600'
                        : index === 2
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    <span className="text-sm font-bold">#{index + 1}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{match.caregiverName}</span>
                      {!match.canAssign && (
                        <Badge variant="destructive" className="text-xs">
                          At Capacity
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {match.profile.yearsExperience}+ years experience •{' '}
                      {match.currentElderCount}/3 elders
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Match score */}
                  <div className={`text-right ${getScoreColor(match.matchScore)}`}>
                    <div className="text-lg font-bold">{match.matchScore}%</div>
                    <div className="text-xs">{match.matchLabel.label}</div>
                  </div>

                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {expandedMatch === match.caregiverId ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>

              {/* Quick match reasons */}
              {match.matchReasons.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {match.matchReasons.slice(0, 3).map((reason, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                      {reason}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <CollapsibleContent>
              <div className="px-3 pb-3 border-t bg-gray-50 dark:bg-gray-800/50">
                {/* Score breakdown */}
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Match Breakdown
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1">
                          <Languages className="w-3 h-3" /> Language
                        </span>
                        <span>{match.matchBreakdown.languageMatch}/25</span>
                      </div>
                      <Progress
                        value={(match.matchBreakdown.languageMatch / 25) * 100}
                        className="h-1"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1">
                          <Award className="w-3 h-3" /> Specialization
                        </span>
                        <span>{match.matchBreakdown.specializationMatch}/30</span>
                      </div>
                      <Progress
                        value={(match.matchBreakdown.specializationMatch / 30) * 100}
                        className="h-1"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Location
                        </span>
                        <span>{match.matchBreakdown.locationMatch}/20</span>
                      </div>
                      <Progress
                        value={(match.matchBreakdown.locationMatch / 20) * 100}
                        className="h-1"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Availability
                        </span>
                        <span>{match.matchBreakdown.availabilityMatch}/15</span>
                      </div>
                      <Progress
                        value={(match.matchBreakdown.availabilityMatch / 15) * 100}
                        className="h-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Certifications */}
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Certifications
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {match.profile.certifications.slice(0, 4).map((cert, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {formatCertification(cert)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Warnings */}
                {match.warnings && match.warnings.length > 0 && (
                  <div className="mt-3">
                    {match.warnings.map((warning, i) => (
                      <p
                        key={i}
                        className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                        {warning}
                      </p>
                    ))}
                  </div>
                )}

                {/* Select button */}
                <Button
                  className="w-full mt-3"
                  size="sm"
                  disabled={!match.canAssign}
                  onClick={() => onSelectCaregiver(match.caregiverId)}
                >
                  {selectedCaregiverId === match.caregiverId
                    ? 'Selected'
                    : match.canAssign
                    ? 'Select This Caregiver'
                    : 'Cannot Assign (At Capacity)'}
                </Button>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  );
}
