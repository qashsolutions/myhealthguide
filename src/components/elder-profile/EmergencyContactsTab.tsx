'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Phone,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Mail,
  MapPin,
  Star,
  User,
  Building,
  Stethoscope,
  Info,
} from 'lucide-react';
import {
  getElderEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
} from '@/lib/firebase/elderHealthProfile';
import type { ElderEmergencyContact, ContactType } from '@/types';

interface EmergencyContactsTabProps {
  elderId: string;
  groupId: string;
  userId: string;
}

export function EmergencyContactsTab({ elderId, groupId, userId }: EmergencyContactsTabProps) {
  const [contacts, setContacts] = useState<ElderEmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<ElderEmergencyContact | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    type: 'family' as ContactType,
    phone: '',
    alternatePhone: '',
    email: '',
    address: '',
    isPrimary: false,
    specialInstructions: '',
  });

  useEffect(() => {
    loadContacts();
  }, [elderId, groupId]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await getElderEmergencyContacts(elderId, groupId);
      setContacts(data);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      relationship: '',
      type: 'family',
      phone: '',
      alternatePhone: '',
      email: '',
      address: '',
      isPrimary: false,
      specialInstructions: '',
    });
    setShowDialog(true);
  };

  const openEditDialog = (contact: ElderEmergencyContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      relationship: contact.relationship,
      type: contact.type,
      phone: contact.phone,
      alternatePhone: contact.alternatePhone || '',
      email: contact.email || '',
      address: contact.address || '',
      isPrimary: contact.isPrimary || false,
      specialInstructions: contact.specialInstructions || '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) return;

    setSaving(true);
    try {
      if (editingContact) {
        await updateEmergencyContact(editingContact.id!, {
          name: formData.name.trim(),
          relationship: formData.relationship.trim(),
          type: formData.type,
          phone: formData.phone.trim(),
          alternatePhone: formData.alternatePhone.trim() || undefined,
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
          isPrimary: formData.isPrimary,
          specialInstructions: formData.specialInstructions.trim() || undefined,
        });
      } else {
        await addEmergencyContact({
          elderId,
          groupId,
          name: formData.name.trim(),
          relationship: formData.relationship.trim(),
          type: formData.type,
          phone: formData.phone.trim(),
          alternatePhone: formData.alternatePhone.trim() || undefined,
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
          isPrimary: formData.isPrimary,
          specialInstructions: formData.specialInstructions.trim() || undefined,
          createdBy: userId,
        });
      }
      setShowDialog(false);
      loadContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      await deleteEmergencyContact(contactId);
      loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  const getTypeIcon = (type: ContactType) => {
    switch (type) {
      case 'family': return <User className="w-4 h-4 text-blue-500" />;
      case 'friend': return <User className="w-4 h-4 text-green-500" />;
      case 'doctor': return <Stethoscope className="w-4 h-4 text-red-500" />;
      case 'hospital': return <Building className="w-4 h-4 text-purple-500" />;
      case 'pharmacy': return <Building className="w-4 h-4 text-teal-500" />;
      default: return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: ContactType) => {
    switch (type) {
      case 'family': return 'Family';
      case 'friend': return 'Friend';
      case 'doctor': return 'Doctor';
      case 'hospital': return 'Hospital';
      case 'pharmacy': return 'Pharmacy';
      case 'other': return 'Other';
    }
  };

  const getTypeBadgeColor = (type: ContactType) => {
    switch (type) {
      case 'family': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'friend': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'doctor': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'hospital': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'pharmacy': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
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

  // Separate primary and other contacts
  const primaryContacts = contacts.filter(c => c.isPrimary);
  const otherContacts = contacts.filter(c => !c.isPrimary);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-500" />
              Emergency Contacts
            </span>
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-1" />
              Add Contact
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Reminder */}
          <Alert className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
              Keep emergency contacts up to date. Mark primary contacts who should be reached first in emergencies.
            </AlertDescription>
          </Alert>

          {contacts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Phone className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No emergency contacts added yet.</p>
              <p className="text-sm mt-1">
                Add family members, doctors, and other important contacts.
              </p>
              <Button variant="outline" className="mt-2" onClick={openAddDialog}>
                <Plus className="w-4 h-4 mr-1" />
                Add First Contact
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Primary Contacts */}
              {primaryContacts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Primary Contacts
                  </h3>
                  {primaryContacts.map(contact => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      onEdit={openEditDialog}
                      onDelete={handleDelete}
                      getTypeIcon={getTypeIcon}
                      getTypeLabel={getTypeLabel}
                      getTypeBadgeColor={getTypeBadgeColor}
                    />
                  ))}
                </div>
              )}

              {/* Other Contacts */}
              {otherContacts.length > 0 && (
                <div className="space-y-3">
                  {primaryContacts.length > 0 && (
                    <h3 className="text-sm font-medium text-gray-500 mt-4">Other Contacts</h3>
                  )}
                  {otherContacts.map(contact => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      onEdit={openEditDialog}
                      onDelete={handleDelete}
                      getTypeIcon={getTypeIcon}
                      getTypeLabel={getTypeLabel}
                      getTypeBadgeColor={getTypeBadgeColor}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contact name"
                />
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Input
                  value={formData.relationship}
                  onChange={e => setFormData({ ...formData, relationship: e.target.value })}
                  placeholder="e.g., Son, Daughter, PCP"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Contact Type</Label>
              <Select
                value={formData.type}
                onValueChange={v => setFormData({ ...formData, type: v as ContactType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="friend">Friend</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Primary phone"
                  type="tel"
                />
              </div>
              <div className="space-y-2">
                <Label>Alternate Phone</Label>
                <Input
                  value={formData.alternatePhone}
                  onChange={e => setFormData({ ...formData, alternatePhone: e.target.value })}
                  placeholder="Secondary phone"
                  type="tel"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email address"
                type="email"
              />
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address"
              />
            </div>

            <div className="space-y-2">
              <Label>Special Instructions</Label>
              <Input
                value={formData.specialInstructions}
                onChange={e => setFormData({ ...formData, specialInstructions: e.target.value })}
                placeholder="e.g., Best time to call, language preference"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={formData.isPrimary}
                onChange={e => setFormData({ ...formData, isPrimary: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor="isPrimary" className="flex items-center gap-1 cursor-pointer">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-sm">Primary contact (call first in emergencies)</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name.trim() || !formData.phone.trim()}
            >
              {saving ? 'Saving...' : editingContact ? 'Update' : 'Add Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Separate ContactCard component
interface ContactCardProps {
  contact: ElderEmergencyContact;
  onEdit: (contact: ElderEmergencyContact) => void;
  onDelete: (id: string) => void;
  getTypeIcon: (type: ContactType) => JSX.Element;
  getTypeLabel: (type: ContactType) => string;
  getTypeBadgeColor: (type: ContactType) => string;
}

function ContactCard({
  contact,
  onEdit,
  onDelete,
  getTypeIcon,
  getTypeLabel,
  getTypeBadgeColor,
}: ContactCardProps) {
  return (
    <div
      className={`p-4 rounded-lg ${
        contact.isPrimary
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
          : 'bg-gray-50 dark:bg-gray-800'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {getTypeIcon(contact.type)}
            <span className="font-medium">{contact.name}</span>
            {contact.relationship && (
              <span className="text-sm text-gray-500">({contact.relationship})</span>
            )}
            <Badge className={getTypeBadgeColor(contact.type)}>
              {getTypeLabel(contact.type)}
            </Badge>
            {contact.isPrimary && (
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                <Star className="w-3 h-3 mr-1" />
                Primary
              </Badge>
            )}
          </div>

          <div className="space-y-1 text-sm">
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              <Phone className="w-4 h-4" />
              {contact.phone}
            </a>

            {contact.alternatePhone && (
              <a
                href={`tel:${contact.alternatePhone}`}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:underline"
              >
                <Phone className="w-4 h-4" />
                {contact.alternatePhone} (alt)
              </a>
            )}

            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:underline"
              >
                <Mail className="w-4 h-4" />
                {contact.email}
              </a>
            )}

            {contact.address && (
              <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" />
                {contact.address}
              </p>
            )}

            {contact.specialInstructions && (
              <p className="text-gray-500 italic mt-2">
                "{contact.specialInstructions}"
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-1 ml-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(contact)}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(contact.id!)}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  );
}
