'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Loader2, AlertTriangle, TrendingUp, Clock, RefreshCw } from 'lucide-react';
import {
  assessCaregiverBurnout,
  assessAllCaregivers,
  type CaregiverBurnoutAssessment
} from '@/lib/medical/caregiverBurnoutDetection';

export default function CaregiverBurnoutPage() {
  const { user } = useAuth();
  const agencyId = user?.agencyId; // Assumes agency admins have agencyId
  const isAgencyAdmin = user?.role === 'agency_admin';

  const [loading, setLoading] = useState(false);
  const [assessments, setAssessments] = useState<CaregiverBurnoutAssessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<CaregiverBurnoutAssessment | null>(null);

  useEffect(() => {
    if (isAgencyAdmin && agencyId) {
      loadAssessments();
    }
  }, [isAgencyAdmin, agencyId]);

  async function loadAssessments() {
    if (!agencyId) return;

    setLoading(true);
    try {
      const results = await assessAllCaregivers(agencyId, 14);
      // Sort by risk score (highest first)
      results.sort((a, b) => b.riskScore - a.riskScore);
      setAssessments(results);
      if (results.length > 0) {
        setSelectedAssessment(results[0]);
      }
    } catch (error) {
      console.error('Error loading assessments:', error);
    } finally {
      setLoading(false);
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-500';
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-500';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-500';
      case 'low':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'moderate':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-blue-600" />;
    }
  };

  if (!isAgencyAdmin) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="p-12 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Agency Admin Access Required
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This feature is only available to agency administrators for monitoring caregiver
            wellbeing.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            Caregiver Burnout Monitoring
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Monitor workload metrics and burnout risk for all caregivers
          </p>
        </div>
        <Button onClick={loadAssessments} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Assessments
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              Workload Analysis
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              This system analyzes the last 14 days of shift data to identify caregivers at risk of
              burnout based on overtime hours, consecutive days worked, number of elders assigned,
              and average shift length.
            </p>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* No Assessments */}
      {!loading && assessments.length === 0 && (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full inline-block mb-4">
              <Users className="h-8 w-8 text-gray-600 dark:text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Assessments Available
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No caregiver data available for burnout assessment. Ensure caregivers have logged
              shifts in the past 14 days.
            </p>
          </div>
        </Card>
      )}

      {/* Assessments */}
      {!loading && assessments.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Caregiver List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase">
              Caregivers ({assessments.length})
            </h2>
            <div className="space-y-2">
              {assessments.map((assessment) => (
                <Card
                  key={assessment.id}
                  className={`p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
                    selectedAssessment?.id === assessment.id
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : ''
                  } ${getRiskColor(assessment.burnoutRisk).split(' ').pop()}`}
                  onClick={() => setSelectedAssessment(assessment)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Caregiver {assessment.caregiverId.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Risk Score: {assessment.riskScore}
                      </p>
                    </div>
                    {assessment.alertGenerated && (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      getRiskColor(assessment.burnoutRisk).split('border-')[0]
                    }`}
                  >
                    {assessment.burnoutRisk.toUpperCase()}
                  </span>
                </Card>
              ))}
            </div>
          </div>

          {/* Detailed Assessment */}
          {selectedAssessment && (
            <div className="lg:col-span-2 space-y-4">
              <Card className={`border-l-4 ${getRiskColor(selectedAssessment.burnoutRisk)} p-6`}>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Caregiver {selectedAssessment.caregiverId.slice(0, 8)}
                    </h3>

                    <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                      <p>
                        <strong>Assessment Date:</strong>{' '}
                        {selectedAssessment.assessmentDate.toLocaleDateString()}
                      </p>
                      <p>
                        <strong>Period:</strong>{' '}
                        {selectedAssessment.period.start.toLocaleDateString()} -{' '}
                        {selectedAssessment.period.end.toLocaleDateString()}
                      </p>
                      <p>
                        <strong>Burnout Risk:</strong>{' '}
                        <span
                          className={`font-semibold uppercase ${
                            selectedAssessment.burnoutRisk === 'critical'
                              ? 'text-red-600 dark:text-red-400'
                              : selectedAssessment.burnoutRisk === 'high'
                              ? 'text-orange-600 dark:text-orange-400'
                              : selectedAssessment.burnoutRisk === 'moderate'
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}
                        >
                          {selectedAssessment.burnoutRisk}
                        </span>
                      </p>
                      <p>
                        <strong>Risk Score:</strong> {selectedAssessment.riskScore} / 100
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Risk Score Meter */}
              <Card className="p-6">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Risk Score Breakdown
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">Risk Level</span>
                    <span className="font-semibold">{selectedAssessment.riskScore} points</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        selectedAssessment.riskScore >= 70
                          ? 'bg-red-600'
                          : selectedAssessment.riskScore >= 50
                          ? 'bg-orange-500'
                          : selectedAssessment.riskScore >= 30
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(selectedAssessment.riskScore, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Low (0-29)</span>
                    <span>Moderate (30-49)</span>
                    <span>High (50-69)</span>
                    <span>Critical (70+)</span>
                  </div>
                </div>
              </Card>

              {/* Burnout Factors */}
              {selectedAssessment.factors.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    Contributing Factors
                  </h4>
                  {selectedAssessment.factors.map((factor, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-2">
                          {getSeverityIcon(factor.severity)}
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                              {factor.description}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              Type: {factor.type.replace(/_/g, ' ')}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                          +{factor.points} pts
                        </span>
                      </div>
                      {factor.data && (
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                          {Object.entries(factor.data).map(([key, value]) => (
                            <div key={key}>
                              <strong>{key}:</strong> {String(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 p-6">
                <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recommendations
                </h4>
                <ul className="space-y-2 text-sm text-purple-800 dark:text-purple-200">
                  {selectedAssessment.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Action Buttons */}
              {selectedAssessment.burnoutRisk !== 'low' && (
                <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 p-4">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-3">
                    ⚠️ <strong>Action Required:</strong> This caregiver's workload should be
                    reviewed. Consider scheduling a check-in meeting to discuss their wellbeing and
                    workload distribution.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      Schedule Check-In
                    </Button>
                    <Button size="sm" variant="outline">
                      Adjust Schedule
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
