'use client';

import { useState, useEffect } from 'react';
import { Type, Eye, Zap } from 'lucide-react';
import { UniversalAccessibilityIcon } from '@/components/icons/UniversalAccessibilityIcon';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface AccessibilitySettings {
  largeText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

const STORAGE_KEY = 'myhealthguide-accessibility';

const defaultSettings: AccessibilitySettings = {
  largeText: false,
  highContrast: false,
  reducedMotion: false,
};

export function AccessibilitySettingsButton() {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [mounted, setMounted] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (e) {
      console.error('Error loading accessibility settings:', e);
    }
  }, []);

  // Apply settings to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Large text - adds class that increases base font size
    if (settings.largeText) {
      root.classList.add('a11y-large-text');
    } else {
      root.classList.remove('a11y-large-text');
    }

    // High contrast - adds class for enhanced contrast
    if (settings.highContrast) {
      root.classList.add('a11y-high-contrast');
    } else {
      root.classList.remove('a11y-high-contrast');
    }

    // Reduced motion - adds class to disable animations
    if (settings.reducedMotion) {
      root.classList.add('a11y-reduced-motion');
    } else {
      root.classList.remove('a11y-reduced-motion');
    }

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving accessibility settings:', e);
    }
  }, [settings, mounted]);

  const updateSetting = (key: keyof AccessibilitySettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Check if any setting is active
  const hasActiveSettings = settings.largeText || settings.highContrast || settings.reducedMotion;

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="relative" disabled>
        <UniversalAccessibilityIcon className="w-5 h-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Accessibility settings"
          title="Accessibility Settings"
        >
          <UniversalAccessibilityIcon className="w-5 h-5" />
          {hasActiveSettings && (
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <UniversalAccessibilityIcon className="w-4 h-4" />
          Accessibility Settings
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Large Text */}
        <div className="px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Type className="w-4 h-4 text-gray-500" />
              <Label htmlFor="large-text" className="text-sm font-medium cursor-pointer">
                Larger Text
              </Label>
            </div>
            <Switch
              id="large-text"
              checked={settings.largeText}
              onCheckedChange={(checked) => updateSetting('largeText', checked)}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-7">
            Increase text size for easier reading
          </p>
        </div>

        {/* High Contrast */}
        <div className="px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-gray-500" />
              <Label htmlFor="high-contrast" className="text-sm font-medium cursor-pointer">
                High Contrast
              </Label>
            </div>
            <Switch
              id="high-contrast"
              checked={settings.highContrast}
              onCheckedChange={(checked) => updateSetting('highContrast', checked)}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-7">
            Enhance color contrast for visibility
          </p>
        </div>

        {/* Reduced Motion */}
        <div className="px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-gray-500" />
              <Label htmlFor="reduced-motion" className="text-sm font-medium cursor-pointer">
                Reduced Motion
              </Label>
            </div>
            <Switch
              id="reduced-motion"
              checked={settings.reducedMotion}
              onCheckedChange={(checked) => updateSetting('reducedMotion', checked)}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-7">
            Minimize animations and transitions
          </p>
        </div>

        <DropdownMenuSeparator />
        <div className="px-3 py-2">
          <p className="text-xs text-gray-400 text-center">
            Settings are saved automatically
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
