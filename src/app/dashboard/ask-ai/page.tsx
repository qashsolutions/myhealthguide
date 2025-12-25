'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  FileText,
  BarChart3,
  Brain,
  Loader2,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Search,
  Mic,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type TabType = 'chat' | 'clinical-notes' | 'reports';

function AskAIContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { selectedElder } = useElder();

  // Get active tab from URL or default to chat
  const activeTab = (searchParams.get('tab') as TabType) || 'chat';

  const [loading, setLoading] = useState(false);

  // Change tab
  const setActiveTab = (tab: TabType) => {
    router.push(`/dashboard/ask-ai?tab=${tab}`, { scroll: false });
  };

  // Tab configuration
  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'chat', label: 'Health Chat', icon: MessageSquare },
    { id: 'clinical-notes', label: 'Clinical Notes', icon: FileText },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  if (!selectedElder) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          Please select an elder from the header to use AI features.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Ask AI
            </h1>
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              <Sparkles className="w-3 h-3 mr-1" />
              New
            </Badge>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            AI-powered health insights and reports for {selectedElder.name}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {activeTab === 'chat' && <ChatTab elderName={selectedElder.name} />}
          {activeTab === 'clinical-notes' && <ClinicalNotesTab elderName={selectedElder.name} />}
          {activeTab === 'reports' && <ReportsTab elderName={selectedElder.name} />}
        </>
      )}

      {/* Disclaimer */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <strong>AI Disclaimer:</strong> AI responses are based on logged data and are not medical advice.
            Always consult healthcare professionals for medical decisions.
          </div>
        </div>
      </Card>
    </div>
  );
}

// Chat Tab
function ChatTab({ elderName }: { elderName: string }) {
  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickActionCard
          title="Health Records Lookup"
          description="Query logged medications, meals, and compliance data"
          icon={Search}
          linkHref="/dashboard/health-chat"
          color="blue"
        />
        <QuickActionCard
          title="Health Assistant"
          description="Ask questions about care and get AI-powered answers"
          icon={Brain}
          linkHref="/dashboard/medgemma"
          color="purple"
        />
        <QuickActionCard
          title="Voice Search"
          description="Use voice to search and log health information"
          icon={Mic}
          linkHref="/dashboard/medications/voice"
          color="green"
        />
      </div>

      {/* Chat Preview */}
      <Card className="p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Start a Conversation
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Ask questions about {elderName}&apos;s medications, compliance, or health patterns
          </p>
          <Link href="/dashboard/health-chat">
            <Button>
              <MessageSquare className="w-4 h-4 mr-2" />
              Open Health Chat
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

// Clinical Notes Tab
function ClinicalNotesTab({ elderName }: { elderName: string }) {
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Generate Clinical Notes
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Create a comprehensive summary report for {elderName}&apos;s next doctor visit.
              Includes medications overview, adherence data, diet entries, and discussion points.
            </p>
            <Link href="/dashboard/clinical-notes">
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                Generate Notes
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gray-50 dark:bg-gray-800/50">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">What&apos;s Included:</h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Patient information and current medications</li>
          <li>• 14-day adherence summary with compliance rates</li>
          <li>• Recent diet and nutrition entries</li>
          <li>• Discussion points and questions for the provider</li>
          <li>• Print-friendly PDF format</li>
        </ul>
      </Card>
    </div>
  );
}

// Reports Tab
function ReportsTab({ elderName }: { elderName: string }) {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <ReportCard
          title="Health Trends Report"
          description="Weekly summaries, compliance charts, and AI insights"
          icon={BarChart3}
          linkHref="/dashboard/insights"
          color="purple"
        />
        <ReportCard
          title="Medication Adherence Report"
          description="Detailed adherence analysis with predictions"
          icon={FileText}
          linkHref="/dashboard/medication-adherence"
          color="blue"
        />
        <ReportCard
          title="Nutrition Analysis Report"
          description="Eating patterns and nutritional insights"
          icon={FileText}
          linkHref="/dashboard/nutrition-analysis"
          color="green"
        />
        <ReportCard
          title="Clinical Notes"
          description="Doctor visit preparation summary"
          icon={FileText}
          linkHref="/dashboard/clinical-notes"
          color="orange"
        />
      </div>
    </div>
  );
}

// Quick Action Card
function QuickActionCard({
  title,
  description,
  icon: Icon,
  linkHref,
  color,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  linkHref: string;
  color: 'blue' | 'purple' | 'green';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  };

  return (
    <Link href={linkHref}>
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
        <div className="flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorClasses[color])}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// Report Card
function ReportCard({
  title,
  description,
  icon: Icon,
  linkHref,
  color,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  linkHref: string;
  color: 'blue' | 'purple' | 'green' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{description}</p>
          <Link href={linkHref}>
            <Button variant="outline" size="sm">
              View Report
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

export default function AskAIPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <AskAIContent />
    </Suspense>
  );
}
