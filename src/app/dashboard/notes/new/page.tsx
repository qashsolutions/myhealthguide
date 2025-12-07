'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  BookOpen,
  ArrowLeft,
  Loader2,
  Plus,
  X,
  Sparkles,
  ChevronDown,
  Book
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { VoiceRecordButton } from '@/components/voice/VoiceRecordButton';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';

export default function NewNotePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [userTags, setUserTags] = useState<string[]>([]);
  const [source, setSource] = useState({
    authorName: '',
    sourceName: '',
    sourceType: '' as 'book' | 'article' | 'course' | 'experience' | 'other' | '',
    referencePage: ''
  });
  const [sourceOpen, setSourceOpen] = useState(false);
  const [inputMethod, setInputMethod] = useState<'manual' | 'voice'>('manual');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Get groupId from user
  const groupId = user?.groups?.[0]?.groupId;

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !userTags.includes(tag) && userTags.length < 10) {
      setUserTags([...userTags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (index: number) => {
    setUserTags(userTags.filter((_, i) => i !== index));
  };

  const handleVoiceRecording = (transcript: string) => {
    setVoiceTranscript(transcript);
    setContent(prev => prev ? `${prev}\n\n${transcript}` : transcript);
    setInputMethod('voice');
  };

  const handleVoiceError = (err: Error) => {
    setError(err.message);
  };

  const handleSave = async () => {
    if (!content.trim()) {
      setError('Please enter note content');
      return;
    }

    if (!groupId) {
      setError('You must be part of a group to create notes');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await authenticatedFetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          title: title.trim() || undefined,
          userTags,
          source: source.sourceName ? {
            authorName: source.authorName || undefined,
            sourceName: source.sourceName,
            sourceType: source.sourceType || undefined,
            referencePage: source.referencePage || undefined
          } : undefined,
          inputMethod,
          voiceTranscript: voiceTranscript || undefined,
          groupId
        })
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/dashboard/notes/${data.note.id}`);
      } else {
        setError(data.error || 'Failed to save note');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <EmailVerificationGate featureName="caregiver notes">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard/notes">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-8 h-8 text-blue-600" />
                New Note
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Capture a caregiving insight or tip
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Note Content
                </CardTitle>
                <CardDescription>
                  Write or speak your caregiving insight. AI will generate a title and extract keywords if you leave the title blank.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title (optional) */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title (optional)</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="AI will generate a title if left blank"
                    className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      if (inputMethod === 'voice') setInputMethod('manual');
                    }}
                    placeholder="Share your caregiving insight, tip, or experience..."
                    className="min-h-[200px] placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>

                {/* Voice Input */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <VoiceRecordButton
                    onRecordingComplete={handleVoiceRecording}
                    onError={handleVoiceError}
                    variant="outline"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Voice Input
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {voiceTranscript
                        ? 'Voice transcript recorded. AI will clean up the text.'
                        : 'Click the microphone to speak your note'}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="Add a tag and press Enter..."
                      className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                    <Button onClick={addTag} size="icon" type="button" variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {userTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {userTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(idx)}
                            className="hover:text-blue-900 dark:hover:text-blue-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    AI will also extract keywords automatically
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Source Citation (Collapsible) */}
            <Card>
              <Collapsible open={sourceOpen} onOpenChange={setSourceOpen}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-t-lg">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Book className="w-5 h-5 text-orange-600" />
                        Source Citation
                      </span>
                      <ChevronDown className={`w-5 h-5 transition-transform ${sourceOpen ? 'rotate-180' : ''}`} />
                    </CardTitle>
                    <CardDescription>
                      Optional: Credit your source
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    <div className="space-y-2">
                      <Label htmlFor="sourceName">Book / Source Name</Label>
                      <Input
                        id="sourceName"
                        value={source.sourceName}
                        onChange={(e) => setSource({ ...source, sourceName: e.target.value })}
                        placeholder="e.g., Passages in Caregiving"
                        className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="authorName">Author</Label>
                      <Input
                        id="authorName"
                        value={source.authorName}
                        onChange={(e) => setSource({ ...source, authorName: e.target.value })}
                        placeholder="e.g., Gail Sheehy"
                        className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sourceType">Type</Label>
                      <select
                        id="sourceType"
                        value={source.sourceType}
                        onChange={(e) => setSource({ ...source, sourceType: e.target.value as any })}
                        className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Select type...</option>
                        <option value="book">Book</option>
                        <option value="article">Article</option>
                        <option value="course">Course / Training</option>
                        <option value="experience">Personal Experience</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="referencePage">Page / Section</Label>
                      <Input
                        id="referencePage"
                        value={source.referencePage}
                        onChange={(e) => setSource({ ...source, referencePage: e.target.value })}
                        placeholder="e.g., Chapter 5, p.123"
                        className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link href="/dashboard/notes">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={handleSave} disabled={isSaving || !content.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Save Note
                </>
              )}
            </Button>
          </div>
        </div>
    </EmailVerificationGate>
  );
}
