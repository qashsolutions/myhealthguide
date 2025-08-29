'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icons } from '@/lib/beehive/icons';
import { supabase } from '@/lib/supabase';
import { debounce } from 'lodash';

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  blocks: string[];
  suggestions: string[];
}

interface MessageValidatorProps {
  message: string;
  senderRole: 'patient' | 'caregiver';
  onValidationChange?: (result: ValidationResult) => void;
  showInline?: boolean;
}

export default function MessageValidator({
  message,
  senderRole,
  onValidationChange,
  showInline = true,
}: MessageValidatorProps) {
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    warnings: [],
    blocks: [],
    suggestions: [],
  });
  const [patterns, setPatterns] = useState<any[]>([]);

  // Load patterns from database on mount
  useEffect(() => {
    loadPatterns();
  }, [senderRole]);

  const loadPatterns = async () => {
    try {
      const { data, error } = await supabase
        .from('privacy_filter_patterns')
        .select('*')
        .eq('is_active', true)
        .or(`applies_to_role.eq.${senderRole},applies_to_role.eq.both`);

      if (data) {
        setPatterns(data);
      }
    } catch (error) {
      console.error('Error loading privacy patterns:', error);
    }
  };

  // Validate message against patterns
  const validateMessage = useCallback(
    debounce((text: string) => {
      if (!text) {
        const result = { isValid: true, warnings: [], blocks: [], suggestions: [] };
        setValidation(result);
        onValidationChange?.(result);
        return;
      }

      const warnings: string[] = [];
      const blocks: string[] = [];
      const suggestions: string[] = [];
      let isValid = true;

      // Check each pattern
      patterns.forEach(pattern => {
        try {
          const regex = new RegExp(pattern.pattern, 'gi');
          if (regex.test(text)) {
            switch (pattern.action) {
              case 'block':
                blocks.push(pattern.block_message || pattern.description);
                isValid = false;
                break;
              case 'remove':
              case 'filter':
                warnings.push(`${pattern.description} will be removed from your message`);
                break;
              case 'warn':
                warnings.push(pattern.description);
                break;
            }
          }
        } catch (e) {
          // Invalid regex, skip
        }
      });

      // Add suggestions for better communication
      if (blocks.length > 0) {
        suggestions.push('Focus on discussing care needs and scheduling');
        suggestions.push('Use the booking system to arrange meetings');
        suggestions.push('Contact information is shared automatically when appropriate');
      } else if (warnings.length > 0) {
        suggestions.push('Keep conversations professional and care-focused');
      }

      const result = { isValid, warnings, blocks, suggestions };
      setValidation(result);
      onValidationChange?.(result);

      // Log validation attempt if blocked
      if (blocks.length > 0) {
        logValidationAttempt(text, blocks);
      }
    }, 300),
    [patterns, onValidationChange]
  );

  // Log blocked attempts for monitoring
  const logValidationAttempt = async (text: string, blocks: string[]) => {
    try {
      await supabase.from('privacy_filter_logs').insert({
        message_snippet: text.substring(0, 50),
        action_taken: 'blocked_typing',
        user_role: senderRole,
        metadata: { blocks },
      });
    } catch (error) {
      console.error('Error logging validation:', error);
    }
  };

  useEffect(() => {
    validateMessage(message);
  }, [message, validateMessage]);

  if (!showInline || validation.isValid) {
    return null;
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Block Messages - Critical */}
      {validation.blocks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start">
            <Icons.Block className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Message will be blocked</p>
              <ul className="mt-1 text-sm text-red-700 space-y-1">
                {validation.blocks.map((block, idx) => (
                  <li key={idx}>{block}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Warning Messages */}
      {validation.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start">
            <Icons.Warning className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">Content will be filtered</p>
              <ul className="mt-1 text-sm text-yellow-700 space-y-1">
                {validation.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {validation.suggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start">
            <Icons.Info className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">Suggestions</p>
              <ul className="mt-1 text-sm text-blue-700 space-y-1">
                {validation.suggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export validation hook for use in other components
export function useMessageValidation(senderRole: 'patient' | 'caregiver') {
  const [patterns, setPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatterns();
  }, [senderRole]);

  const loadPatterns = async () => {
    try {
      const { data } = await supabase
        .from('privacy_filter_patterns')
        .select('*')
        .eq('is_active', true)
        .or(`applies_to_role.eq.${senderRole},applies_to_role.eq.both`);

      if (data) {
        setPatterns(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const validate = (message: string): ValidationResult => {
    const warnings: string[] = [];
    const blocks: string[] = [];
    const suggestions: string[] = [];
    let isValid = true;

    patterns.forEach(pattern => {
      try {
        const regex = new RegExp(pattern.pattern, 'gi');
        if (regex.test(message)) {
          switch (pattern.action) {
            case 'block':
              blocks.push(pattern.block_message || pattern.description);
              isValid = false;
              break;
            case 'remove':
            case 'filter':
              warnings.push(`${pattern.description} will be removed`);
              break;
            case 'warn':
              warnings.push(pattern.description);
              break;
          }
        }
      } catch (e) {
        // Invalid regex
      }
    });

    return { isValid, warnings, blocks, suggestions };
  };

  return { validate, patterns, loading };
}