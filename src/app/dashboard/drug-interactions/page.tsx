'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2, Shield, RefreshCw } from 'lucide-react';
import { UnifiedAIConsentDialog } from '@/components/consent/UnifiedAIConsentDialog';
import { FDADataDisclaimer } from '@/components/medical/FDADataDisclaimer';
import { FDADataDisplay } from '@/components/medical/FDADataDisplay';
import { verifyAndLogAccess } from '@/lib/consent/unifiedConsentManagement';
import {
  runInteractionCheck,
  getFDADataForMedication
} from '@/lib/medical/drugInteractionDetection';
import type { FDADrugLabelData } from '@/lib/medical/fdaApi';

export default function DrugInteractionsPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const groupId = selectedElder?.groupId || user?.groups?.[0]?.groupId;
  const elderId = selectedElder?.id;

  // Unified consent state
  const [hasConsent, setHasConsent] = useState(false);
  const [checkingConsent, setCheckingConsent] = useState(true);
  const [showConsentDialog, setShowConsentDialog] = useState(false);

  // Feature state
  const [loading, setLoading] = useState(false);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [showFDADisclaimer, setShowFDADisclaimer] = useState(false);
  const [fdaDataToShow, setFdaDataToShow] = useState<FDADrugLabelData | null>(null);
  const [medicationNameForFDA, setMedicationNameForFDA] = useState('');

  // Check unified consent on mount
  useEffect(() => {
    if (!user?.id || !groupId) {
      setCheckingConsent(false);
      return;
    }

    checkConsent();
  }, [user?.id, groupId]);

  async function checkConsent() {
    if (!user?.id || !groupId) return;

    setCheckingConsent(true);
    try {
      const { allowed } = await verifyAndLogAccess(
        user.id,
        groupId,
        'drug_interactions',
        elderId
      );

      setHasConsent(allowed);

      if (!allowed) {
        setShowConsentDialog(true);
      } else {
        loadInteractions();
      }
    } catch (error) {
      console.error('Error checking consent:', error);
    } finally {
      setCheckingConsent(false);
    }
  }

  const handleConsentComplete = async () => {
    setShowConsentDialog(false);
    setHasConsent(true);

    // Log access after consent
    if (user?.id && groupId) {
      await verifyAndLogAccess(
        user.id,
        groupId,
        'drug_interactions',
        elderId
      );
    }

    loadInteractions();
  };

  async function loadInteractions() {
    if (!groupId) return;

    setLoading(true);
    try {
      const result = await runInteractionCheck(groupId, elderId || '');
      setInteractions(result.interactions);
    } catch (error) {
      console.error('Error loading interactions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function viewFDAData(medicationId: string, medicationName: string) {
    setMedicationNameForFDA(medicationName);
    setShowFDADisclaimer(true);

    // Pre-load FDA data while user reads disclaimer
    const fdaData = await getFDADataForMedication(medicationId, medicationName);
    setFdaDataToShow(fdaData);
  }

  function handleFDADisclaimerAccept() {
    setShowFDADisclaimer(false);
  }

  if (checkingConsent) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!hasConsent) {
    return (
      <div className="p-6">
        <Alert className="mb-4 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <strong>AI & Medical Consent Required:</strong> To use Drug Interactions, please review
            and accept the terms.
            <Button size="sm" className="mt-2 ml-2" onClick={() => setShowConsentDialog(true)}>
              Review Terms & Enable
            </Button>
          </AlertDescription>
        </Alert>

        {user && groupId && (
          <UnifiedAIConsentDialog
            open={showConsentDialog}
            userId={user.id}
            groupId={groupId}
            onConsent={handleConsentComplete}
            onDecline={() => window.location.href = '/dashboard'}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Drug Interactions
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            FDA drug label information for current medications
          </p>
        </div>
        <Button onClick={loadInteractions} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Persistent Warning */}
      <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-yellow-900 dark:text-yellow-100">
              Medical Disclaimer
            </p>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
              This information is from FDA drug labels and is NOT medical advice. Always consult
              your doctor or pharmacist before making medication decisions.
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

      {/* No Interactions */}
      {!loading && interactions.length === 0 && (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full inline-block mb-4">
              <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Potential Interactions Detected
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Based on FDA drug label data, no current medications mention each other in their
              interaction warnings. However, always consult your doctor about all medications.
            </p>
          </div>
        </Card>
      )}

      {/* Interactions List */}
      {!loading && interactions.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Found {interactions.length} potential interaction{interactions.length !== 1 ? 's' : ''}{' '}
            based on FDA drug label data
          </p>

          {interactions.map((interaction, index) => (
            <Card
              key={index}
              className="border-l-4 border-yellow-500 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Potential Interaction Detected
                  </h3>

                  <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <p>
                      <strong className="text-gray-900 dark:text-gray-100">
                        {interaction.medication1.name}
                      </strong>{' '}
                      and{' '}
                      <strong className="text-gray-900 dark:text-gray-100">
                        {interaction.medication2.name}
                      </strong>
                    </p>

                    <div className="flex gap-4 text-xs">
                      {interaction.medication1MentionsMed2 && (
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded text-yellow-800 dark:text-yellow-200">
                          {interaction.medication1.name} FDA label mentions{' '}
                          {interaction.medication2.name}
                        </span>
                      )}
                      {interaction.medication2MentionsMed1 && (
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded text-yellow-800 dark:text-yellow-200">
                          {interaction.medication2.name} FDA label mentions{' '}
                          {interaction.medication1.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3">
                    {interaction.fdaData1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          viewFDAData(interaction.medication1.id, interaction.medication1.name)
                        }
                      >
                        View {interaction.medication1.name} FDA Data
                      </Button>
                    )}
                    {interaction.fdaData2 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          viewFDAData(interaction.medication2.id, interaction.medication2.name)
                        }
                      >
                        View {interaction.medication2.name} FDA Data
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* FDA Data Disclaimer Modal */}
      {showFDADisclaimer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-3xl w-full">
            <FDADataDisclaimer
              medicationName={medicationNameForFDA}
              onAccept={handleFDADisclaimerAccept}
              onDecline={() => {
                setShowFDADisclaimer(false);
                setFdaDataToShow(null);
              }}
            />
          </div>
        </div>
      )}

      {/* FDA Data Display */}
      {fdaDataToShow && !showFDADisclaimer && (
        <div className="mt-6">
          <FDADataDisplay fdaData={fdaDataToShow} medicationName={medicationNameForFDA} />
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => {
                setFdaDataToShow(null);
                setMedicationNameForFDA('');
              }}
            >
              Close FDA Data
            </Button>
          </div>
        </div>
      )}

      {/* Unified Consent Dialog */}
      {user && groupId && (
        <UnifiedAIConsentDialog
          open={showConsentDialog}
          userId={user.id}
          groupId={groupId}
          onConsent={handleConsentComplete}
          onDecline={() => window.location.href = '/dashboard'}
        />
      )}
    </div>
  );
}
