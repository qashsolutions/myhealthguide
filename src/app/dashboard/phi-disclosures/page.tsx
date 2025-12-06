'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getAccountingOfDisclosures, PHIAuditLog } from '@/lib/medical/phiAuditLog';
import { useAuth } from '@/contexts/AuthContext';
import {
  FileText,
  Download,
  Calendar,
  Clock,
  Shield,
  AlertCircle,
  Info,
  ExternalLink
} from 'lucide-react';
import { format, subYears } from 'date-fns';

export default function PHIDisclosuresPage() {
  const { user } = useAuth();
  const [disclosures, setDisclosures] = useState<PHIAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Date range filters - default to last 6 years per HIPAA
  const defaultStartDate = subYears(new Date(), 6);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(new Date());

  // Load disclosures
  useEffect(() => {
    loadDisclosures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, startDate, endDate]);

  const loadDisclosures = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const logs = await getAccountingOfDisclosures(user.id, startDate, endDate);
      setDisclosures(logs);
    } catch (err: any) {
      console.error('Error loading disclosures:', err);
      setError('Failed to load disclosure records. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (disclosures.length === 0) {
      return;
    }

    // Create CSV content
    const headers = ['Date', 'Service Name', 'Service Type', 'Data Shared', 'Purpose', 'Elder', 'Location'];
    const rows = disclosures.map(disclosure => [
      format(disclosure.timestamp, 'yyyy-MM-dd HH:mm:ss'),
      disclosure.thirdPartyDisclosure?.serviceName || '',
      disclosure.thirdPartyDisclosure?.serviceType || '',
      disclosure.thirdPartyDisclosure?.dataShared?.join(', ') || '',
      disclosure.thirdPartyDisclosure?.purpose || '',
      disclosure.elderId || '',
      [disclosure.location?.city, disclosure.location?.state, disclosure.location?.country]
        .filter(Boolean)
        .join(', ') || 'Unknown'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `phi-disclosures-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getServiceTypeColor = (serviceType: string) => {
    switch (serviceType) {
      case 'health_summary_generation':
      case 'diet_analysis':
      case 'compliance_pattern_detection':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300';
      case 'drug_information_lookup':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
      default:
        return 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getServiceIcon = (serviceName: string) => {
    if (serviceName.includes('Gemini')) {
      return '🤖';
    }
    if (serviceName.includes('FDA')) {
      return '💊';
    }
    return '🔗';
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Please sign in to view your disclosure records.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            Accounting of Disclosures
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            HIPAA-compliant record of all third-party PHI disclosures
          </p>
        </div>
        <Button
          onClick={exportToCSV}
          disabled={disclosures.length === 0}
          variant="outline"
        >
          <Download className="w-4 h-4 mr-2" />
          Export to CSV
        </Button>
      </div>

      {/* HIPAA Information */}
      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="ml-2 text-blue-800 dark:text-blue-200">
          <strong>HIPAA Right to Accounting:</strong> Under HIPAA 45 CFR § 164.528, you have the right to receive an
          accounting of disclosures of your protected health information (PHI) to third parties. This page shows all
          instances where your health data was shared with external services for the past 6 years.
        </AlertDescription>
      </Alert>

      {/* Error Message */}
      {error && (
        <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="ml-2 text-red-800 dark:text-red-200">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Filter by Date Range
          </CardTitle>
          <CardDescription>
            Default range: Last 6 years (HIPAA requirement)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={format(startDate, 'yyyy-MM-dd')}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                max={format(endDate, 'yyyy-MM-dd')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={format(endDate, 'yyyy-MM-dd')}
                onChange={(e) => setEndDate(new Date(e.target.value))}
                min={format(startDate, 'yyyy-MM-dd')}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <Button onClick={loadDisclosures} variant="outline">
              Apply Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Disclosures</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{disclosures.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unique Services</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Set(disclosures.map(d => d.thirdPartyDisclosure?.serviceName)).size}
                </p>
              </div>
              <ExternalLink className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Date Range</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {format(startDate, 'MMM yyyy')} - {format(endDate, 'MMM yyyy')}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disclosures List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-600 dark:text-gray-400">Loading disclosure records...</p>
              </div>
            </CardContent>
          </Card>
        ) : disclosures.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                No disclosures found for the selected date range.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                This means no health information was shared with third-party services during this period.
              </p>
            </CardContent>
          </Card>
        ) : (
          disclosures.map((disclosure) => (
            <Card key={disclosure.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Service Icon */}
                  <div className="text-4xl">
                    {getServiceIcon(disclosure.thirdPartyDisclosure?.serviceName || '')}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {disclosure.thirdPartyDisclosure?.serviceName}
                          </h3>
                          <Badge className={getServiceTypeColor(disclosure.thirdPartyDisclosure?.serviceType || '')}>
                            {disclosure.thirdPartyDisclosure?.serviceType?.replace(/_/g, ' ')}
                          </Badge>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {disclosure.thirdPartyDisclosure?.purpose}
                        </p>

                        {/* Data Shared */}
                        {disclosure.thirdPartyDisclosure?.dataShared && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Data Shared:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {disclosure.thirdPartyDisclosure.dataShared.map((dataType, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {dataType.replace(/_/g, ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                          {disclosure.elderId && (
                            <span>Elder: {disclosure.elderId}</span>
                          )}
                          {disclosure.location && (
                            <span>
                              Location: {[disclosure.location.city, disclosure.location.state, disclosure.location.country]
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                          )}
                          {disclosure.deviceType && (
                            <span className="capitalize">Device: {disclosure.deviceType}</span>
                          )}
                          {disclosure.browser && (
                            <span>Browser: {disclosure.browser}</span>
                          )}
                        </div>
                      </div>

                      {/* Date/Time */}
                      <div className="text-right ml-4">
                        <div className="flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-white">
                          <Clock className="w-4 h-4" />
                          <span>{format(disclosure.timestamp, 'h:mm a')}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {format(disclosure.timestamp, 'MMM dd, yyyy')}
                        </p>
                        {disclosure.thirdPartyDisclosure?.disclosureId && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-mono">
                            ID: {disclosure.thirdPartyDisclosure.disclosureId.slice(0, 8)}...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Footer Info */}
      <Card className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            About This Accounting
          </h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>
              <strong>What is included:</strong> All disclosures of your protected health information (PHI) to third-party
              services, including AI processing services and external APIs.
            </p>
            <p>
              <strong>What is NOT included:</strong> Disclosures for treatment, payment, or healthcare operations made
              directly to you or authorized by you are not required to be in this accounting per HIPAA.
            </p>
            <p>
              <strong>Your rights:</strong> You may request a copy of this accounting at any time. Per HIPAA, the first
              request in a 12-month period is free; subsequent requests may incur a reasonable cost-based fee.
            </p>
            <p>
              <strong>Questions?</strong> If you have questions about these disclosures or your HIPAA rights, please
              contact our privacy officer through the support section.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
