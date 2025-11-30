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
import { AlertTriangle, Plus, Edit2, Trash2, Loader2, Pill, Apple, Wind } from 'lucide-react';
import {
  getElderAllergies,
  addAllergy,
  updateAllergy,
  deleteAllergy,
} from '@/lib/firebase/elderHealthProfile';
import type { ElderAllergy, AllergyType, AllergySeverity } from '@/types';
import { format } from 'date-fns';

interface AllergiesTabProps {
  elderId: string;
  groupId: string;
  userId: string;
}

export function AllergiesTab({ elderId, groupId, userId }: AllergiesTabProps) {
  const [allergies, setAllergies] = useState<ElderAllergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAllergy, setEditingAllergy] = useState<ElderAllergy | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    allergen: '',
    type: 'medication' as AllergyType,
    reaction: '',
    severity: 'moderate' as AllergySeverity,
    discoveredDate: '',
    notes: '',
  });

  useEffect(() => {
    loadAllergies();
  }, [elderId]);

  const loadAllergies = async () => {
    setLoading(true);
    try {
      const data = await getElderAllergies(elderId);
      setAllergies(data);
    } catch (error) {
      console.error('Error loading allergies:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingAllergy(null);
    setFormData({
      allergen: '',
      type: 'medication',
      reaction: '',
      severity: 'moderate',
      discoveredDate: '',
      notes: '',
    });
    setShowDialog(true);
  };

  const openEditDialog = (allergy: ElderAllergy) => {
    setEditingAllergy(allergy);
    setFormData({
      allergen: allergy.allergen,
      type: allergy.type,
      reaction: allergy.reaction,
      severity: allergy.severity,
      discoveredDate: allergy.discoveredDate ? format(allergy.discoveredDate, 'yyyy-MM-dd') : '',
      notes: allergy.notes || '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.allergen.trim() || !formData.reaction.trim()) return;

    setSaving(true);
    try {
      if (editingAllergy) {
        await updateAllergy(editingAllergy.id!, {
          allergen: formData.allergen.trim(),
          type: formData.type,
          reaction: formData.reaction.trim(),
          severity: formData.severity,
          discoveredDate: formData.discoveredDate ? new Date(formData.discoveredDate) : undefined,
          notes: formData.notes.trim() || undefined,
        });
      } else {
        await addAllergy({
          elderId,
          groupId,
          allergen: formData.allergen.trim(),
          type: formData.type,
          reaction: formData.reaction.trim(),
          severity: formData.severity,
          discoveredDate: formData.discoveredDate ? new Date(formData.discoveredDate) : undefined,
          notes: formData.notes.trim() || undefined,
          createdBy: userId,
        });
      }
      setShowDialog(false);
      loadAllergies();
    } catch (error) {
      console.error('Error saving allergy:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (allergyId: string) => {
    if (!confirm('Are you sure you want to delete this allergy?')) return;

    try {
      await deleteAllergy(allergyId);
      loadAllergies();
    } catch (error) {
      console.error('Error deleting allergy:', error);
    }
  };

  const getSeverityColor = (severity: AllergySeverity) => {
    switch (severity) {
      case 'mild': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'severe': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'life_threatening': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    }
  };

  const getTypeIcon = (type: AllergyType) => {
    switch (type) {
      case 'medication': return <Pill className="w-4 h-4" />;
      case 'food': return <Apple className="w-4 h-4" />;
      case 'environmental': return <Wind className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: AllergyType) => {
    switch (type) {
      case 'medication': return 'Medication';
      case 'food': return 'Food';
      case 'environmental': return 'Environmental';
      case 'other': return 'Other';
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

  // Separate life-threatening allergies for prominent display
  const lifeThreatening = allergies.filter(a => a.severity === 'life_threatening');
  const otherAllergies = allergies.filter(a => a.severity !== 'life_threatening');

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Allergies
            </span>
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-1" />
              Add Allergy
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allergies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No allergies recorded yet.</p>
              <Button variant="outline" className="mt-2" onClick={openAddDialog}>
                <Plus className="w-4 h-4 mr-1" />
                Add First Allergy
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Life-threatening allergies */}
              {lifeThreatening.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h3 className="font-semibold text-red-700 dark:text-red-300 flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5" />
                    Life-Threatening Allergies
                  </h3>
                  <div className="space-y-2">
                    {lifeThreatening.map(allergy => (
                      <div
                        key={allergy.id}
                        className="flex items-start justify-between bg-white dark:bg-gray-800 p-3 rounded"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(allergy.type)}
                            <span className="font-medium text-red-700 dark:text-red-300">{allergy.allergen}</span>
                            <Badge variant="outline" className="text-xs">{getTypeLabel(allergy.type)}</Badge>
                          </div>
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                            Reaction: {allergy.reaction}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(allergy)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(allergy.id!)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other allergies */}
              <div className="space-y-3">
                {otherAllergies.map(allergy => (
                  <div
                    key={allergy.id}
                    className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(allergy.type)}
                        <span className="font-medium">{allergy.allergen}</span>
                        <Badge variant="outline" className="text-xs">{getTypeLabel(allergy.type)}</Badge>
                        <Badge className={getSeverityColor(allergy.severity)}>
                          {allergy.severity.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Reaction: {allergy.reaction}
                      </p>
                      {allergy.discoveredDate && (
                        <p className="text-xs text-gray-500">
                          Discovered: {format(allergy.discoveredDate, 'MMM d, yyyy')}
                        </p>
                      )}
                      {allergy.notes && (
                        <p className="text-sm text-gray-500">{allergy.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(allergy)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(allergy.id!)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAllergy ? 'Edit Allergy' : 'Add Allergy'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Allergen *</Label>
              <Input
                value={formData.allergen}
                onChange={e => setFormData({ ...formData, allergen: e.target.value })}
                placeholder="e.g., Penicillin, Peanuts, Pollen"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={v => setFormData({ ...formData, type: v as AllergyType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medication">Medication</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="environmental">Environmental</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={formData.severity}
                  onValueChange={v => setFormData({ ...formData, severity: v as AllergySeverity })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                    <SelectItem value="life_threatening">Life-Threatening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reaction *</Label>
              <Input
                value={formData.reaction}
                onChange={e => setFormData({ ...formData, reaction: e.target.value })}
                placeholder="e.g., Hives, Swelling, Difficulty breathing"
              />
            </div>
            <div className="space-y-2">
              <Label>Discovered Date</Label>
              <Input
                type="date"
                value={formData.discoveredDate}
                onChange={e => setFormData({ ...formData, discoveredDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this allergy"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.allergen.trim() || !formData.reaction.trim()}
            >
              {saving ? 'Saving...' : editingAllergy ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
