'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Heart, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import {
  getElderHealthConditions,
  addHealthCondition,
  updateHealthCondition,
  deleteHealthCondition,
} from '@/lib/firebase/elderHealthProfile';
import type { ElderHealthCondition, ConditionSeverity, ConditionStatus } from '@/types';
import { format } from 'date-fns';

interface HealthConditionsTabProps {
  elderId: string;
  groupId: string;
  userId: string;
}

export function HealthConditionsTab({ elderId, groupId, userId }: HealthConditionsTabProps) {
  const [conditions, setConditions] = useState<ElderHealthCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCondition, setEditingCondition] = useState<ElderHealthCondition | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    conditionName: '',
    severity: 'moderate' as ConditionSeverity,
    status: 'active' as ConditionStatus,
    diagnosisDate: '',
    diagnosedBy: '',
    notes: '',
  });

  useEffect(() => {
    loadConditions();
  }, [elderId, groupId]);

  const loadConditions = async () => {
    setLoading(true);
    try {
      const data = await getElderHealthConditions(elderId, groupId);
      setConditions(data);
    } catch (error) {
      console.error('Error loading conditions:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingCondition(null);
    setFormData({
      conditionName: '',
      severity: 'moderate',
      status: 'active',
      diagnosisDate: '',
      diagnosedBy: '',
      notes: '',
    });
    setShowDialog(true);
  };

  const openEditDialog = (condition: ElderHealthCondition) => {
    setEditingCondition(condition);
    setFormData({
      conditionName: condition.conditionName,
      severity: condition.severity,
      status: condition.status,
      diagnosisDate: condition.diagnosisDate ? format(condition.diagnosisDate, 'yyyy-MM-dd') : '',
      diagnosedBy: condition.diagnosedBy || '',
      notes: condition.notes || '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.conditionName.trim()) return;

    setSaving(true);
    try {
      if (editingCondition) {
        await updateHealthCondition(editingCondition.id!, {
          conditionName: formData.conditionName.trim(),
          severity: formData.severity,
          status: formData.status,
          diagnosisDate: formData.diagnosisDate ? new Date(formData.diagnosisDate) : undefined,
          diagnosedBy: formData.diagnosedBy.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        });
      } else {
        await addHealthCondition({
          elderId,
          groupId,
          conditionName: formData.conditionName.trim(),
          severity: formData.severity,
          status: formData.status,
          diagnosisDate: formData.diagnosisDate ? new Date(formData.diagnosisDate) : undefined,
          diagnosedBy: formData.diagnosedBy.trim() || undefined,
          notes: formData.notes.trim() || undefined,
          createdBy: userId,
        });
      }
      setShowDialog(false);
      loadConditions();
    } catch (error) {
      console.error('Error saving condition:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (conditionId: string) => {
    if (!confirm('Are you sure you want to delete this condition?')) return;

    try {
      await deleteHealthCondition(conditionId);
      loadConditions();
    } catch (error) {
      console.error('Error deleting condition:', error);
    }
  };

  const getSeverityColor = (severity: ConditionSeverity) => {
    switch (severity) {
      case 'mild': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'severe': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    }
  };

  const getStatusColor = (status: ConditionStatus) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    }
  };

  if (loading) {
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
              <Heart className="w-5 h-5 text-red-500" />
              Health Conditions
            </span>
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-1" />
              Add Condition
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conditions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Heart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No health conditions recorded yet.</p>
              <Button variant="outline" className="mt-2" onClick={openAddDialog}>
                <Plus className="w-4 h-4 mr-1" />
                Add First Condition
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {conditions.map(condition => (
                <div
                  key={condition.id}
                  className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{condition.conditionName}</span>
                      <Badge className={getSeverityColor(condition.severity)}>
                        {condition.severity}
                      </Badge>
                      <Badge className={getStatusColor(condition.status)}>
                        {condition.status}
                      </Badge>
                    </div>
                    {condition.diagnosisDate && (
                      <p className="text-sm text-gray-500">
                        Diagnosed: {format(condition.diagnosisDate, 'MMM d, yyyy')}
                        {condition.diagnosedBy && ` by ${condition.diagnosedBy}`}
                      </p>
                    )}
                    {condition.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{condition.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(condition)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(condition.id!)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCondition ? 'Edit Condition' : 'Add Health Condition'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Condition Name *</Label>
              <Input
                value={formData.conditionName}
                onChange={e => setFormData({ ...formData, conditionName: e.target.value })}
                placeholder="e.g., Diabetes Type 2, Hypertension"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={formData.severity}
                  onValueChange={v => setFormData({ ...formData, severity: v as ConditionSeverity })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={v => setFormData({ ...formData, status: v as ConditionStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Diagnosis Date</Label>
                <Input
                  type="date"
                  value={formData.diagnosisDate}
                  onChange={e => setFormData({ ...formData, diagnosisDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Diagnosed By</Label>
                <Input
                  value={formData.diagnosedBy}
                  onChange={e => setFormData({ ...formData, diagnosedBy: e.target.value })}
                  placeholder="Doctor name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this condition"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.conditionName.trim()}>
              {saving ? 'Saving...' : editingCondition ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
