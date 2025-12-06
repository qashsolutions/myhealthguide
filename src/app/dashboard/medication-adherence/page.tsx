'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Lightbulb,
  RefreshCw
} from 'lucide-react';
import {
  predictMedicationAdherence,
  getAllAdherencePredictions,
  type MedicationAdherencePrediction
} from '@/lib/medical/medicationAdherencePrediction';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Medication } from '@/types';

export default function MedicationAdherencePage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const groupId = selectedElder?.groupId || user?.groups?.[0]?.groupId;
  const elderId = selectedElder?.id;

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [predictions, setPredictions] = useState<MedicationAdherencePrediction[]>([]);
  const [selectedPrediction, setSelectedPrediction] = useState<MedicationAdherencePrediction | null>(null);

  useEffect(() => {
    loadPredictions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, elderId]);

  async function loadPredictions() {
    if (!groupId || !elderId) return;

    setLoading(true);
    try {
      const results = await getAllAdherencePredictions(groupId, elderId);
      setPredictions(results);
      if (results.length > 0) {
        setSelectedPrediction(results[0]);
      }
    } catch (error) {
      console.error('Error loading predictions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function runAdherenceAnalysis() {
    if (!groupId || !elderId) return;

    setAnalyzing(true);
    try {
      // Get all active medications
      const medicationsQuery = query(
        collection(db, 'medications'),
        where('groupId', '==', groupId),
        where('elderId', '==', elderId)
      );

      const medicationsSnap = await getDocs(medicationsQuery);
      const medications = medicationsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Medication));

      // Run predictions for each medication
      for (const med of medications) {
        await predictMedicationAdherence(
          groupId,
          elderId,
          med.id,
          med.name,
          30
        );
      }

      await loadPredictions();
    } catch (error) {
      console.error('Error running analysis:', error);
    } finally {
      setAnalyzing(false);
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
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300 border-gray-500';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            Medication Adherence Prediction
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Smart analysis to predict and prevent missed medications
          </p>
        </div>
        <Button onClick={runAdherenceAnalysis} disabled={analyzing || loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
          Run Analysis
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              Predictive Analytics
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              This system analyzes medication-taking patterns to predict which doses might be missed
              and recommends interventions. Use this to proactively send reminders and support.
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

      {/* No Predictions */}
      {!loading && predictions.length === 0 && (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full inline-block mb-4">
              <TrendingUp className="h-8 w-8 text-gray-600 dark:text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Predictions Yet
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Run your first adherence analysis to identify medications at risk of being missed.
              Requires at least 7 days of medication log data.
            </p>
            <Button onClick={runAdherenceAnalysis} disabled={analyzing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
              Run First Analysis
            </Button>
          </div>
        </Card>
      )}

      {/* Predictions */}
      {!loading && predictions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Medication List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase">
              Medications ({predictions.length})
            </h2>
            <div className="space-y-2">
              {predictions.map((prediction) => (
                <Card
                  key={prediction.id}
                  className={`p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
                    selectedPrediction?.id === prediction.id
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : ''
                  } ${getRiskColor(prediction.riskLevel).split(' ').pop()}`}
                  onClick={() => setSelectedPrediction(prediction)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {prediction.medicationName}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        {getTrendIcon(prediction.trendDirection)}
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {prediction.currentAdherenceRate}% adherence
                        </span>
                      </div>
                    </div>
                    {prediction.predictedMissedDoses > 0 && (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      getRiskColor(prediction.riskLevel).split('border-')[0]
                    }`}
                  >
                    {prediction.riskLevel.toUpperCase()} RISK
                  </span>
                </Card>
              ))}
            </div>
          </div>

          {/* Detailed Prediction */}
          {selectedPrediction && (
            <div className="lg:col-span-2 space-y-4">
              {/* Overview Card */}
              <Card className={`border-l-4 ${getRiskColor(selectedPrediction.riskLevel)} p-6`}>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {selectedPrediction.medicationName}
                    </h3>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Current Adherence</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-2xl">
                          {selectedPrediction.currentAdherenceRate}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Risk Score</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-2xl">
                          {selectedPrediction.riskScore}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Trend</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getTrendIcon(selectedPrediction.trendDirection)}
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {selectedPrediction.trendDirection}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Predicted Misses (7d)</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-2xl">
                          {selectedPrediction.predictedMissedDoses}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Risk Factors */}
              {selectedPrediction.riskFactors.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    Risk Factors Identified
                  </h4>
                  {selectedPrediction.riskFactors.map((factor, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle
                            className={`h-4 w-4 mt-0.5 ${
                              factor.severity === 'high'
                                ? 'text-red-600'
                                : factor.severity === 'moderate'
                                ? 'text-yellow-600'
                                : 'text-blue-600'
                            }`}
                          />
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
                    </Card>
                  ))}
                </div>
              )}

              {/* High-Risk Times */}
              {selectedPrediction.highRiskTimes.length > 0 && (
                <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">
                      High-Risk Times
                    </h4>
                  </div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                    These times have historically higher miss rates:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPrediction.highRiskTimes.map((time, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded text-sm font-medium"
                      >
                        {time}
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {/* High-Risk Days */}
              {selectedPrediction.highRiskDays.length > 0 && (
                <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <h4 className="font-semibold text-orange-900 dark:text-orange-100">
                      High-Risk Days
                    </h4>
                  </div>
                  <p className="text-sm text-orange-800 dark:text-orange-200 mb-2">
                    Lower adherence typically occurs on:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPrediction.highRiskDays.map((day, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded text-sm font-medium"
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {/* Interventions */}
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h4 className="font-semibold text-green-900 dark:text-green-100">
                    Recommended Interventions
                  </h4>
                </div>
                <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
                  {selectedPrediction.recommendedInterventions.map((intervention, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{intervention}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
