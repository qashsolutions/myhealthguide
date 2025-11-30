'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Calendar, Ruler, Scale, Droplet, Save, Edit2, X } from 'lucide-react';
import { updateElderProfile } from '@/lib/firebase/elderHealthProfile';
import type { Elder } from '@/types';
import { format } from 'date-fns';

interface ElderProfileTabProps {
  elder: Elder;
  groupId: string;
  userId: string;
  onUpdate: () => void;
}

export function ElderProfileTab({ elder, groupId, userId, onUpdate }: ElderProfileTabProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    preferredName: elder.preferredName || '',
    gender: elder.gender || '',
    biologicalSex: elder.biologicalSex || '',
    languages: elder.languages?.join(', ') || '',
    ethnicity: elder.ethnicity || '',
    heightValue: elder.height?.value?.toString() || '',
    heightUnit: elder.height?.unit || 'in',
    weightValue: elder.weight?.value?.toString() || '',
    weightUnit: elder.weight?.unit || 'lb',
    bloodType: elder.bloodType || '',
    dietaryRestrictions: elder.dietaryRestrictions?.join(', ') || '',
    foodPreferences: elder.foodPreferences?.join(', ') || '',
    foodDislikes: elder.foodDislikes?.join(', ') || '',
    bedtime: elder.sleepSchedule?.bedtime || '',
    wakeTime: elder.sleepSchedule?.wakeTime || '',
    mobilityLevel: elder.mobilityLevel || '',
    cognitiveStatus: elder.cognitiveStatus || '',
    communicationNotes: elder.communicationNotes?.join('\n') || '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Partial<Elder> = {
        preferredName: formData.preferredName || undefined,
        gender: formData.gender as Elder['gender'] || undefined,
        biologicalSex: formData.biologicalSex as Elder['biologicalSex'] || undefined,
        languages: formData.languages ? formData.languages.split(',').map(l => l.trim()).filter(Boolean) : undefined,
        ethnicity: formData.ethnicity || undefined,
        height: formData.heightValue ? {
          value: parseFloat(formData.heightValue),
          unit: formData.heightUnit as 'in' | 'cm',
        } : undefined,
        weight: formData.weightValue ? {
          value: parseFloat(formData.weightValue),
          unit: formData.weightUnit as 'lb' | 'kg',
        } : undefined,
        bloodType: formData.bloodType as Elder['bloodType'] || undefined,
        dietaryRestrictions: formData.dietaryRestrictions ? formData.dietaryRestrictions.split(',').map(d => d.trim()).filter(Boolean) : undefined,
        foodPreferences: formData.foodPreferences ? formData.foodPreferences.split(',').map(f => f.trim()).filter(Boolean) : undefined,
        foodDislikes: formData.foodDislikes ? formData.foodDislikes.split(',').map(f => f.trim()).filter(Boolean) : undefined,
        sleepSchedule: (formData.bedtime || formData.wakeTime) ? {
          bedtime: formData.bedtime,
          wakeTime: formData.wakeTime,
        } : undefined,
        mobilityLevel: formData.mobilityLevel as Elder['mobilityLevel'] || undefined,
        cognitiveStatus: formData.cognitiveStatus as Elder['cognitiveStatus'] || undefined,
        communicationNotes: formData.communicationNotes ? formData.communicationNotes.split('\n').map(n => n.trim()).filter(Boolean) : undefined,
      };

      const result = await updateElderProfile(elder.id!, updates);
      if (result.success) {
        setEditing(false);
        onUpdate();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const calculateAge = (dob: Date) => {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const getMobilityLabel = (level: string) => {
    const labels: Record<string, string> = {
      independent: 'Independent',
      minimal_assistance: 'Minimal Assistance',
      moderate_assistance: 'Moderate Assistance',
      extensive_assistance: 'Extensive Assistance',
      dependent: 'Dependent',
      bedridden: 'Bedridden',
    };
    return labels[level] || level;
  };

  const getCognitiveLabel = (status: string) => {
    const labels: Record<string, string> = {
      sharp: 'Sharp / Alert',
      mild_decline: 'Mild Decline',
      moderate_decline: 'Moderate Decline',
      severe_decline: 'Severe Decline',
    };
    return labels[status] || status;
  };

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Edit Profile
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-1" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Demographics */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Demographics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preferred Name</Label>
                <Input
                  value={formData.preferredName}
                  onChange={e => setFormData({ ...formData, preferredName: e.target.value })}
                  placeholder="Nickname or preferred name"
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={formData.gender || ''} onValueChange={(v) => setFormData({ ...formData, gender: v as 'male' | 'female' | 'other' | 'prefer_not_to_say' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Biological Sex (for medical relevance)</Label>
                <Select value={formData.biologicalSex || ''} onValueChange={(v) => setFormData({ ...formData, biologicalSex: v as 'male' | 'female' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Languages (comma separated)</Label>
                <Input
                  value={formData.languages}
                  onChange={e => setFormData({ ...formData, languages: e.target.value })}
                  placeholder="English, Spanish"
                />
              </div>
              <div className="space-y-2">
                <Label>Ethnicity (optional)</Label>
                <Input
                  value={formData.ethnicity}
                  onChange={e => setFormData({ ...formData, ethnicity: e.target.value })}
                  placeholder="For health risk factors"
                />
              </div>
            </div>
          </div>

          {/* Physical Attributes */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Physical Attributes</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Height</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.heightValue}
                    onChange={e => setFormData({ ...formData, heightValue: e.target.value })}
                    placeholder="Height"
                  />
                  <Select value={formData.heightUnit} onValueChange={v => setFormData({ ...formData, heightUnit: v as 'in' | 'cm' })}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">in</SelectItem>
                      <SelectItem value="cm">cm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Weight</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.weightValue}
                    onChange={e => setFormData({ ...formData, weightValue: e.target.value })}
                    placeholder="Weight"
                  />
                  <Select value={formData.weightUnit} onValueChange={v => setFormData({ ...formData, weightUnit: v as 'lb' | 'kg' })}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lb">lb</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Blood Type</Label>
                <Select value={formData.bloodType || ''} onValueChange={(v) => setFormData({ ...formData, bloodType: v as 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Care Preferences */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Care Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dietary Restrictions (comma separated)</Label>
                <Input
                  value={formData.dietaryRestrictions}
                  onChange={e => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
                  placeholder="Low sodium, Diabetic diet"
                />
              </div>
              <div className="space-y-2">
                <Label>Food Preferences (comma separated)</Label>
                <Input
                  value={formData.foodPreferences}
                  onChange={e => setFormData({ ...formData, foodPreferences: e.target.value })}
                  placeholder="Soft foods, Warm meals"
                />
              </div>
              <div className="space-y-2">
                <Label>Food Dislikes (comma separated)</Label>
                <Input
                  value={formData.foodDislikes}
                  onChange={e => setFormData({ ...formData, foodDislikes: e.target.value })}
                  placeholder="Spicy food, Fish"
                />
              </div>
              <div className="space-y-2">
                <Label>Sleep Schedule</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="time"
                    value={formData.bedtime}
                    onChange={e => setFormData({ ...formData, bedtime: e.target.value })}
                  />
                  <span className="text-gray-500">to</span>
                  <Input
                    type="time"
                    value={formData.wakeTime}
                    onChange={e => setFormData({ ...formData, wakeTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mobility Level</Label>
                <Select value={formData.mobilityLevel || ''} onValueChange={(v) => setFormData({ ...formData, mobilityLevel: v as 'independent' | 'minimal_assistance' | 'moderate_assistance' | 'extensive_assistance' | 'dependent' | 'bedridden' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mobility level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="independent">Independent</SelectItem>
                    <SelectItem value="minimal_assistance">Minimal Assistance</SelectItem>
                    <SelectItem value="moderate_assistance">Moderate Assistance</SelectItem>
                    <SelectItem value="extensive_assistance">Extensive Assistance</SelectItem>
                    <SelectItem value="dependent">Dependent</SelectItem>
                    <SelectItem value="bedridden">Bedridden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cognitive Status</Label>
                <Select value={formData.cognitiveStatus || ''} onValueChange={(v) => setFormData({ ...formData, cognitiveStatus: v as 'sharp' | 'mild_decline' | 'moderate_decline' | 'severe_decline' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cognitive status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sharp">Sharp / Alert</SelectItem>
                    <SelectItem value="mild_decline">Mild Decline</SelectItem>
                    <SelectItem value="moderate_decline">Moderate Decline</SelectItem>
                    <SelectItem value="severe_decline">Severe Decline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Communication Notes (one per line)</Label>
              <Textarea
                value={formData.communicationNotes}
                onChange={e => setFormData({ ...formData, communicationNotes: e.target.value })}
                placeholder="Hard of hearing - speak loudly&#10;Responds better in the morning&#10;Prefers simple questions"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Basic Information
          </span>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit2 className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Full Name</p>
            <p className="font-medium">{elder.name}</p>
          </div>
          {elder.preferredName && (
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Preferred Name</p>
              <p className="font-medium">{elder.preferredName}</p>
            </div>
          )}
          {elder.dateOfBirth && (
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Date of Birth</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                {format(elder.dateOfBirth, 'MMM d, yyyy')}
              </p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Age</p>
            <p className="font-medium">
              {elder.dateOfBirth
                ? `${calculateAge(elder.dateOfBirth)} years`
                : elder.approximateAge
                  ? `~${elder.approximateAge} years`
                  : 'Not specified'}
            </p>
          </div>
          {elder.gender && (
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Gender</p>
              <p className="font-medium capitalize">{elder.gender.replace('_', ' ')}</p>
            </div>
          )}
          {elder.languages && elder.languages.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Languages</p>
              <div className="flex flex-wrap gap-1">
                {elder.languages.map(lang => (
                  <Badge key={lang} variant="secondary" className="text-xs">{lang}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Physical Attributes */}
        {(elder.height || elder.weight || elder.bloodType) && (
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Physical Attributes</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {elder.height && (
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-gray-400" />
                  <span>{elder.height.value} {elder.height.unit}</span>
                </div>
              )}
              {elder.weight && (
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-gray-400" />
                  <span>{elder.weight.value} {elder.weight.unit}</span>
                </div>
              )}
              {elder.bloodType && (
                <div className="flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-red-400" />
                  <span>Blood Type: {elder.bloodType}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Care Preferences */}
        {(elder.mobilityLevel || elder.cognitiveStatus || elder.dietaryRestrictions?.length || elder.sleepSchedule) && (
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Care Preferences</h3>
            <div className="space-y-3">
              {elder.mobilityLevel && (
                <div>
                  <span className="text-sm text-gray-500">Mobility:</span>
                  <Badge variant="outline" className="ml-2">{getMobilityLabel(elder.mobilityLevel)}</Badge>
                </div>
              )}
              {elder.cognitiveStatus && (
                <div>
                  <span className="text-sm text-gray-500">Cognitive Status:</span>
                  <Badge variant="outline" className="ml-2">{getCognitiveLabel(elder.cognitiveStatus)}</Badge>
                </div>
              )}
              {elder.sleepSchedule && (elder.sleepSchedule.bedtime || elder.sleepSchedule.wakeTime) && (
                <div>
                  <span className="text-sm text-gray-500">Sleep Schedule:</span>
                  <span className="ml-2">
                    {elder.sleepSchedule.bedtime || '?'} - {elder.sleepSchedule.wakeTime || '?'}
                  </span>
                </div>
              )}
              {elder.dietaryRestrictions && elder.dietaryRestrictions.length > 0 && (
                <div>
                  <span className="text-sm text-gray-500">Dietary Restrictions:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {elder.dietaryRestrictions.map(d => (
                      <Badge key={d} variant="destructive" className="text-xs">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {elder.communicationNotes && elder.communicationNotes.length > 0 && (
                <div>
                  <span className="text-sm text-gray-500">Communication Notes:</span>
                  <ul className="list-disc list-inside mt-1 text-sm">
                    {elder.communicationNotes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!elder.preferredName && !elder.gender && !elder.height && !elder.mobilityLevel && (
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No additional profile information added yet.</p>
            <Button variant="outline" className="mt-2" onClick={() => setEditing(true)}>
              <Edit2 className="w-4 h-4 mr-1" />
              Add Profile Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
