'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Plus, FileText, X } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { format } from 'date-fns';

type IncidentType = 'fall' | 'medication_error' | 'behavioral' | 'injury' | 'emergency' | 'other';
type IncidentSeverity = 'minor' | 'moderate' | 'serious' | 'critical';

interface Incident {
  id: string;
  groupId: string;
  elderId: string;
  reportedBy: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  occurredAt: Date;
  location: string;
  description: string;
  immediateAction: string;
  injuryDetails?: string;
  witnessPresent: boolean;
  witnessName?: string;
  familyNotified: boolean;
  doctorNotified: boolean;
  emergencyServices: boolean;
  status: 'reported' | 'reviewed' | 'resolved';
  createdAt: Date;
}

export default function IncidentsPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    incidentType: 'fall' as IncidentType,
    severity: 'moderate' as IncidentSeverity,
    occurredAt: new Date().toISOString().slice(0, 16),
    location: '',
    description: '',
    immediateAction: '',
    injuryDetails: '',
    witnessPresent: false,
    witnessName: '',
    familyNotified: false,
    doctorNotified: false,
    emergencyServices: false
  });

  useEffect(() => {
    if (selectedElder) {
      loadIncidents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElder]);

  const loadIncidents = async () => {
    if (!selectedElder || !selectedElder.groupId) return;

    try {
      const incidentsQuery = query(
        collection(db, 'incidents'),
        where('groupId', '==', selectedElder.groupId),
        where('elderId', '==', selectedElder.id),
        orderBy('occurredAt', 'desc'),
        limit(20)
      );

      const snapshot = await getDocs(incidentsQuery);
      const loadedIncidents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        occurredAt: doc.data().occurredAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      })) as Incident[];

      setIncidents(loadedIncidents);
    } catch (err: any) {
      console.error('Error loading incidents:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedElder) return;

    setLoading(true);

    try {
      const incident: Omit<Incident, 'id'> = {
        groupId: user.groups?.[0]?.groupId || '',
        elderId: selectedElder.id,
        reportedBy: user.id,
        incidentType: formData.incidentType,
        severity: formData.severity,
        occurredAt: new Date(formData.occurredAt),
        location: formData.location,
        description: formData.description,
        immediateAction: formData.immediateAction,
        injuryDetails: formData.injuryDetails || undefined,
        witnessPresent: formData.witnessPresent,
        witnessName: formData.witnessName || undefined,
        familyNotified: formData.familyNotified,
        doctorNotified: formData.doctorNotified,
        emergencyServices: formData.emergencyServices,
        status: 'reported',
        createdAt: new Date()
      };

      await addDoc(collection(db, 'incidents'), incident);

      // Reset form
      setFormData({
        incidentType: 'fall',
        severity: 'moderate',
        occurredAt: new Date().toISOString().slice(0, 16),
        location: '',
        description: '',
        immediateAction: '',
        injuryDetails: '',
        witnessPresent: false,
        witnessName: '',
        familyNotified: false,
        doctorNotified: false,
        emergencyServices: false
      });

      setShowForm(false);
      await loadIncidents();

      // TODO: Send SMS/email notification to admin for serious/critical incidents
    } catch (err: any) {
      console.error('Error submitting incident:', err);
      alert('Failed to submit incident report');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: IncidentSeverity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      case 'serious': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
      case 'minor': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
    }
  };

  if (!selectedElder) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8">
          <CardContent>
            <p className="text-center text-gray-600 dark:text-gray-400">
              Please select an elder to manage incident reports
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Incident Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Document and track incidents for {selectedElder.name}
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <><X className="w-4 h-4 mr-2" />Cancel</>
          ) : (
            <><Plus className="w-4 h-4 mr-2" />Report Incident</>
          )}
        </Button>
      </div>

      {/* Incident Report Form */}
      {showForm && (
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <CardTitle>New Incident Report</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Incident Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Incident Type *
                  </label>
                  <select
                    value={formData.incidentType}
                    onChange={(e) => setFormData({...formData, incidentType: e.target.value as IncidentType})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                    required
                  >
                    <option value="fall">Fall</option>
                    <option value="medication_error">Medication Error</option>
                    <option value="behavioral">Behavioral Incident</option>
                    <option value="injury">Injury</option>
                    <option value="emergency">Medical Emergency</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Severity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Severity *
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({...formData, severity: e.target.value as IncidentSeverity})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                    required
                  >
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="serious">Serious</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                {/* Date/Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date & Time Occurred *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.occurredAt}
                    onChange={(e) => setFormData({...formData, occurredAt: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                    required
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="e.g., Bedroom, Bathroom, Kitchen"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Detailed Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={4}
                  placeholder="Describe what happened..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              {/* Immediate Action */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Immediate Action Taken *
                </label>
                <textarea
                  value={formData.immediateAction}
                  onChange={(e) => setFormData({...formData, immediateAction: e.target.value})}
                  rows={3}
                  placeholder="What was done immediately after the incident?"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              {/* Injury Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Injury Details (if applicable)
                </label>
                <textarea
                  value={formData.injuryDetails}
                  onChange={(e) => setFormData({...formData, injuryDetails: e.target.value})}
                  rows={2}
                  placeholder="Describe any injuries..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.witnessPresent}
                    onChange={(e) => setFormData({...formData, witnessPresent: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Witness Present</span>
                </label>

                {formData.witnessPresent && (
                  <input
                    type="text"
                    value={formData.witnessName}
                    onChange={(e) => setFormData({...formData, witnessName: e.target.value})}
                    placeholder="Witness name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white ml-6"
                  />
                )}

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.familyNotified}
                    onChange={(e) => setFormData({...formData, familyNotified: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Family Notified</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.doctorNotified}
                    onChange={(e) => setFormData({...formData, doctorNotified: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Doctor/Healthcare Provider Notified</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.emergencyServices}
                    onChange={(e) => setFormData({...formData, emergencyServices: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Emergency Services Called (911)</span>
                </label>
              </div>

              {/* Submit */}
              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? 'Submitting...' : 'Submit Incident Report'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Incident History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Incident History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400 py-8">
              No incidents reported
            </p>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <Card key={incident.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getSeverityColor(incident.severity)}`}>
                              {incident.severity.toUpperCase()}
                            </span>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                              {incident.incidentType.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {format(incident.occurredAt, 'MMM d, yyyy • h:mm a')} • {incident.location}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Description:</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{incident.description}</p>
                      </div>

                      {/* Actions Taken */}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Immediate Action:</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{incident.immediateAction}</p>
                      </div>

                      {/* Notifications */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t dark:border-gray-700">
                        {incident.familyNotified && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded">
                            Family Notified
                          </span>
                        )}
                        {incident.doctorNotified && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs rounded">
                            Doctor Notified
                          </span>
                        )}
                        {incident.emergencyServices && (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs rounded">
                            911 Called
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
