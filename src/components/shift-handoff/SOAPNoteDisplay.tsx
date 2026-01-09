'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Utensils,
  Pill,
  Activity,
  MessageSquare,
  ArrowRight,
  Bell
} from 'lucide-react';
import type { SOAPNote, ActionPriority } from '@/types';
import { format } from 'date-fns';

interface SOAPNoteDisplayProps {
  soapNote: SOAPNote;
  elderName: string;
  shiftStart: Date;
  shiftEnd: Date;
  caregiverName?: string;
}

const priorityConfig: Record<ActionPriority, { color: string; icon: string; bgColor: string }> = {
  critical: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    icon: '🔴',
  },
  follow_up: {
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    icon: '🟡',
  },
  routine: {
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    icon: '🟢',
  },
};

export function SOAPNoteDisplay({
  soapNote,
  elderName,
  shiftStart,
  shiftEnd,
  caregiverName,
}: SOAPNoteDisplayProps) {
  // Robust date conversion that handles Firestore Timestamps, strings, and Date objects
  const toValidDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? null : date;
    }
    // Handle Firestore Timestamp objects
    if (typeof date === 'object' && 'seconds' in date) {
      return new Date(date.seconds * 1000);
    }
    if (typeof date === 'string' || typeof date === 'number') {
      const d = new Date(date);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const formatTime = (date: Date | string | any) => {
    const d = toValidDate(date);
    if (!d) return '--:--';
    try {
      return format(d, 'h:mm a');
    } catch {
      return '--:--';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Shift Handoff - {elderName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {toValidDate(shiftStart) ? format(toValidDate(shiftStart)!, 'MMM d, yyyy') : 'Unknown Date'} | {formatTime(shiftStart)} - {formatTime(shiftEnd)}
            </p>
            {caregiverName && (
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Caregiver: {caregiverName}
              </p>
            )}
          </div>
          <Badge variant={soapNote.generatedBy === 'ai' ? 'default' : 'secondary'}>
            {soapNote.generatedBy === 'ai' ? 'Smart Generated' : 'Auto Generated'}
          </Badge>
        </div>
      </div>

      {/* Family Alert Banner */}
      {soapNote.plan.familyAlertSent && soapNote.plan.familyAlertMessage && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-purple-900 dark:text-purple-100 uppercase">
                Family Notified
              </p>
              <p className="text-sm text-purple-800 dark:text-purple-200 mt-1">
                {soapNote.plan.familyAlertMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUBJECTIVE Section */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide">
              Subjective
            </h4>
          </div>

          <div className="space-y-2 ml-10">
            {soapNote.subjective.reports.length > 0 ? (
              soapNote.subjective.reports.map((report, idx) => (
                <p key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                  • {report}
                </p>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                No specific reports noted
              </p>
            )}

            {soapNote.subjective.moodObservation && (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">Mood:</span> {soapNote.subjective.moodObservation}
              </p>
            )}

            {soapNote.subjective.complaints.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Complaints:</p>
                {soapNote.subjective.complaints.map((complaint, idx) => (
                  <p key={idx} className="text-sm text-red-600 dark:text-red-400">
                    • {complaint}
                  </p>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* OBJECTIVE Section */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 uppercase tracking-wide">
              Objective
            </h4>
          </div>

          <div className="space-y-4 ml-10">
            {/* Medications */}
            {soapNote.objective.medications.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="w-4 h-4 text-gray-500" />
                  <p className="text-xs font-medium text-gray-500 uppercase">Medications</p>
                </div>
                <div className="space-y-1">
                  {soapNote.objective.medications.map((med, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">
                        {med.name} {med.dose && `(${med.dose})`}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs">
                          {formatTime(med.time)}
                        </span>
                        <span className={
                          med.status === 'missed' ? 'text-red-600 font-medium' :
                          med.status === 'late' ? 'text-yellow-600 font-medium' :
                          'text-green-600'
                        }>
                          {med.status === 'on-time' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            med.status.toUpperCase()
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supplements */}
            {soapNote.objective.supplements.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="w-4 h-4 text-gray-500" />
                  <p className="text-xs font-medium text-gray-500 uppercase">Supplements</p>
                </div>
                <div className="space-y-1">
                  {soapNote.objective.supplements.map((supp, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{supp.name}</span>
                      <span className={supp.taken ? 'text-green-600' : 'text-red-600'}>
                        {supp.taken ? <CheckCircle className="w-4 h-4" /> : 'MISSED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nutrition */}
            {soapNote.objective.nutrition.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Utensils className="w-4 h-4 text-gray-500" />
                  <p className="text-xs font-medium text-gray-500 uppercase">Nutrition</p>
                </div>
                <div className="space-y-1">
                  {soapNote.objective.nutrition.map((meal, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300 capitalize">
                        {meal.meal}
                        {meal.notes && <span className="text-gray-500 ml-2">- {meal.notes}</span>}
                      </span>
                      <span className={
                        meal.percentageEaten < 50 ? 'text-red-600 font-medium' :
                        meal.percentageEaten < 75 ? 'text-yellow-600' :
                        'text-green-600'
                      }>
                        {meal.percentageEaten}% eaten
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activities */}
            {soapNote.objective.activities && soapNote.objective.activities.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-gray-500" />
                  <p className="text-xs font-medium text-gray-500 uppercase">Activities</p>
                </div>
                <div className="space-y-1">
                  {soapNote.objective.activities.map((activity, idx) => (
                    <p key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                      • {activity}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ASSESSMENT Section */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 uppercase tracking-wide">
              Assessment
            </h4>
          </div>

          <div className="ml-10 space-y-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {soapNote.assessment.summary}
            </p>

            {soapNote.assessment.concerns.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase mb-1">
                  Concerns
                </p>
                {soapNote.assessment.concerns.map((concern, idx) => (
                  <p key={idx} className="text-sm text-red-600 dark:text-red-400">
                    • {concern}
                  </p>
                ))}
              </div>
            )}

            {soapNote.assessment.positives.length > 0 && (
              <div>
                <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase mb-1">
                  Positives
                </p>
                {soapNote.assessment.positives.map((positive, idx) => (
                  <p key={idx} className="text-sm text-green-600 dark:text-green-400">
                    • {positive}
                  </p>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PLAN Section */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100 uppercase tracking-wide">
              Plan (Next Shift)
            </h4>
          </div>

          <div className="ml-10 space-y-2">
            {soapNote.plan.actions.map((action, idx) => {
              const config = priorityConfig[action.priority];
              return (
                <div
                  key={idx}
                  className={`border rounded-lg p-3 ${config.bgColor}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm">{config.icon}</span>
                    <div>
                      <p className={`text-sm font-medium ${config.color}`}>
                        {action.action}
                      </p>
                      {action.reason && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {action.reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
