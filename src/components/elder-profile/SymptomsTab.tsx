'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Activity, Plus, Edit2, Trash2, Loader2, Info, Clock, Calendar } from 'lucide-react';
import {
  getElderSymptoms,
  addSymptom,
  updateSymptom,
  deleteSymptom,
  canLogSymptoms,
} from '@/lib/firebase/elderHealthProfile';
import type { ElderSymptom, SymptomSeverity } from '@/types';
import { format } from 'date-fns';

interface SymptomsTabProps {
  elderId: string;
  groupId: string;
  userId: string;
  elderName: string;
}

export function SymptomsTab({ elderId, groupId, userId, elderName }: SymptomsTabProps) {
  const [symptoms, setSymptoms] = useState<ElderSymptom[]>([]);
  const [loading, setLoading] = useState(true);
  const [canLog, setCanLog] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSymptom, setEditingSymptom] = useState<ElderSymptom | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    symptom: '',
    severity: 'moderate' as SymptomSeverity,
    duration: '',
    frequency: '',
    triggers: '',
    notes: '',
    observedAt: '',
  });

  useEffect(() => {
    checkPermissions();
    loadSymptoms();
  }, [elderId, groupId, userId]);

  const checkPermissions = async () => {
    setCheckingPermission(true);
    try {
      const hasPermission = await canLogSymptoms(userId, elderId, groupId);
      setCanLog(hasPermission);
    } catch (error) {
      console.error('Error checking permissions:', error);
      setCanLog(false);
    } finally {
      setCheckingPermission(false);
    }
  };

  const loadSymptoms = async () => {
    setLoading(true);
    try {
      const data = await getElderSymptoms(elderId);
      setSymptoms(data);
    } catch (error) {
      console.error('Error loading symptoms:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingSymptom(null);
    const now = new Date();
    setFormData({
      symptom: '',
      severity: 'moderate',
      duration: '',
      frequency: '',
      triggers: '',
      notes: '',
      observedAt: format(now, "yyyy-MM-dd'T'HH:mm"),
    });
    setShowDialog(true);
  };

  const openEditDialog = (symptom: ElderSymptom) => {
    setEditingSymptom(symptom);
    setFormData({
      symptom: symptom.symptom,
      severity: symptom.severity,
      duration: symptom.duration || '',
      frequency: symptom.frequency || '',
      triggers: symptom.triggers?.join(', ') || '',
      notes: symptom.notes || '',
      observedAt: symptom.observedAt ? format(symptom.observedAt, "yyyy-MM-dd'T'HH:mm") : '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.symptom.trim()) return;

    setSaving(true);
    try {
      const triggersArray = formData.triggers
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      if (editingSymptom) {
        await updateSymptom(editingSymptom.id!, {
          symptom: formData.symptom.trim(),
          severity: formData.severity,
          duration: formData.duration.trim() || undefined,
          frequency: formData.frequency.trim() || undefined,
          triggers: triggersArray.length > 0 ? triggersArray : undefined,
          notes: formData.notes.trim() || undefined,
          observedAt: formData.observedAt ? new Date(formData.observedAt) : new Date(),
        });
      } else {
        await addSymptom({
          elderId,
          groupId,
          symptom: formData.symptom.trim(),
          severity: formData.severity,
          duration: formData.duration.trim() || undefined,
          frequency: formData.frequency.trim() || undefined,
          triggers: triggersArray.length > 0 ? triggersArray : undefined,
          notes: formData.notes.trim() || undefined,
          observedAt: formData.observedAt ? new Date(formData.observedAt) : new Date(),
          reportedBy: userId,
        });
      }
      setShowDialog(false);
      loadSymptoms();
    } catch (error) {
      console.error('Error saving symptom:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (symptomId: string) => {
    if (!confirm('Are you sure you want to delete this symptom log?')) return;

    try {
      await deleteSymptom(symptomId);
      loadSymptoms();
    } catch (error) {
      console.error('Error deleting symptom:', error);
    }
  };

  const getSeverityColor = (severity: SymptomSeverity) => {
    switch (severity) {
      case 'mild': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'severe': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    }
  };

  if (loading || checkingPermission) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Symptom Log
            </span>
            {canLog && (
              <Button size="sm" onClick={openAddDialog}>
                <Plus className="w-4 h-4 mr-1" />
                Log Symptom
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Permission notice */}
          {!canLog && (
            <Alert className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                Only the group admin or {elderName}'s primary caregiver can log symptoms.
                You can view the symptom history below.
              </AlertDescription>
            </Alert>
          )}

          {/* Medical disclaimer */}
          <Alert className="mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
              <strong>Important:</strong> This symptom log is for caregiving reference only.
              If you observe severe or concerning symptoms, contact the elder's healthcare provider immediately.
              This is not a substitute for professional medical assessment.
            </AlertDescription>
          </Alert>

          {symptoms.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No symptoms logged yet.</p>
              {canLog && (
                <Button variant="outline" className="mt-2" onClick={openAddDialog}>
                  <Plus className="w-4 h-4 mr-1" />
                  Log First Symptom
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {symptoms.map(symptom => (
                <div
                  key={symptom.id}
                  className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{symptom.symptom}</span>
                      <Badge className={getSeverityColor(symptom.severity)}>
                        {symptom.severity}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(symptom.observedAt, 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(symptom.observedAt, 'h:mm a')}
                      </span>
                    </div>

                    {symptom.duration && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Duration:</strong> {symptom.duration}
                      </p>
                    )}

                    {symptom.frequency && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Frequency:</strong> {symptom.frequency}
                      </p>
                    )}

                    {symptom.triggers && symptom.triggers.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Triggers:</strong>
                        </span>
                        {symptom.triggers.map((trigger, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {trigger}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {symptom.notes && (
                      <p className="text-sm text-gray-500">{symptom.notes}</p>
                    )}
                  </div>

                  {canLog && (
                    <div className="flex gap-1 ml-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(symptom)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(symptom.id!)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSymptom ? 'Edit Symptom' : 'Log Symptom'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Symptom *</Label>
              <Input
                value={formData.symptom}
                onChange={e => setFormData({ ...formData, symptom: e.target.value })}
                placeholder="e.g., Headache, Nausea, Dizziness"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={formData.severity}
                  onValueChange={v => setFormData({ ...formData, severity: v as SymptomSeverity })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Observed At</Label>
                <Input
                  type="datetime-local"
                  value={formData.observedAt}
                  onChange={e => setFormData({ ...formData, observedAt: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input
                  value={formData.duration}
                  onChange={e => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="e.g., 30 minutes, 2 hours"
                />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Input
                  value={formData.frequency}
                  onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                  placeholder="e.g., Daily, Occasional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Triggers (comma-separated)</Label>
              <Input
                value={formData.triggers}
                onChange={e => setFormData({ ...formData, triggers: e.target.value })}
                placeholder="e.g., Bright lights, Loud noises, Certain foods"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional observations about this symptom"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.symptom.trim()}>
              {saving ? 'Saving...' : editingSymptom ? 'Update' : 'Log Symptom'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
