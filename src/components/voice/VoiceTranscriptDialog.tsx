'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, CheckCircle, XCircle, Info } from 'lucide-react';
import { parseVoiceTranscript, VoiceParseResult } from '@/lib/voice/speechRecognition';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface VoiceTranscriptDialogProps {
  open: boolean;
  onClose: () => void;
  transcript: string;
  onConfirm: (parsedData: VoiceParseResult, editedTranscript: string) => void;
  onRetry: () => void;
}

export function VoiceTranscriptDialog({
  open,
  onClose,
  transcript,
  onConfirm,
  onRetry
}: VoiceTranscriptDialogProps) {
  const [parsedData, setParsedData] = useState<VoiceParseResult | null>(null);
  const [editedTranscript, setEditedTranscript] = useState(transcript);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (transcript) {
      setEditedTranscript(transcript);
      const parsed = parseVoiceTranscript(transcript);
      setParsedData(parsed);
    }
  }, [transcript]);

  const handleConfirm = () => {
    if (parsedData) {
      onConfirm(parsedData, editedTranscript);
    }
  };

  const handleEditTranscript = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const parsed = parseVoiceTranscript(editedTranscript);
    setParsedData(parsed);
    setIsEditing(false);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'medication':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'supplement':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'diet':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-blue-600" />
            Voice Recording Result
          </DialogTitle>
          <DialogDescription>
            Review and confirm the transcription
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Transcript */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Transcript</Label>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditTranscript}
                  className="text-xs"
                >
                  Edit
                </Button>
              )}
            </div>
            {isEditing ? (
              <>
                <Textarea
                  value={editedTranscript}
                  onChange={(e) => setEditedTranscript(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveEdit}
                  className="w-full"
                >
                  Apply Changes
                </Button>
              </>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <p className="text-sm italic text-gray-900 dark:text-white">
                  &quot;{editedTranscript}&quot;
                </p>
              </div>
            )}
          </div>

          {/* Parsed Data */}
          {parsedData ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-green-600 dark:text-green-400 font-medium">
                  Successfully parsed
                </span>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Type:</span>
                  <Badge className={getTypeColor(parsedData.type)}>
                    {parsedData.type}
                  </Badge>
                </div>

                {parsedData.elderName && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Loved One:</span>
                    <span className="text-sm font-medium">{parsedData.elderName}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Item:</span>
                  <span className="text-sm font-medium">{parsedData.itemName}</span>
                </div>

                {parsedData.dosage && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Dosage:</span>
                    <span className="text-sm font-medium">{parsedData.dosage}</span>
                  </div>
                )}

                {parsedData.time && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Time:</span>
                    <span className="text-sm font-medium">{parsedData.time}</span>
                  </div>
                )}

                {parsedData.items && parsedData.items.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Items:</span>
                    <div className="flex flex-wrap gap-1">
                      {parsedData.items.map((item, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                Could not parse the transcript. Please try recording again or enter the information manually.
              </AlertDescription>
            </Alert>
          )}

          {/* Tips */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="ml-2 text-xs">
              <strong>Voice tips:</strong> Say &quot;[Name] took [Medication] [Dosage] at [Time]&quot; or &quot;[Name] had [Meal]: [items]&quot;
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onRetry}>
            Try Again
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {parsedData && (
            <Button onClick={handleConfirm}>
              Confirm & Log
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
