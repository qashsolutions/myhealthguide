'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Icons } from '@/lib/beehive/icons';

interface FilterPattern {
  id: string;
  pattern_type: string;
  category: string;
  pattern: string;
  description: string;
  severity: string;
  action: string;
  replacement_text?: string;
  block_message?: string;
  applies_to_role: string;
  is_active: boolean;
  created_at: string;
}

export default function PrivacyFiltersAdmin() {
  const [patterns, setPatterns] = useState<FilterPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPattern, setEditingPattern] = useState<FilterPattern | null>(null);
  const [formData, setFormData] = useState({
    pattern_type: 'block',
    category: 'security',
    pattern: '',
    description: '',
    severity: 'medium',
    action: 'block',
    replacement_text: '',
    block_message: '',
    applies_to_role: 'both',
  });
  const [testMessage, setTestMessage] = useState('');
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    try {
      const { data, error } = await supabase
        .from('privacy_filter_patterns')
        .select('*')
        .order('severity', { ascending: true })
        .order('created_at', { ascending: false });

      if (data) {
        setPatterns(data);
      }
    } catch (error) {
      console.error('Error loading patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingPattern) {
        // Update existing pattern
        const { error } = await supabase
          .from('privacy_filter_patterns')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPattern.id);

        if (error) throw error;
      } else {
        // Create new pattern
        const { error } = await supabase
          .from('privacy_filter_patterns')
          .insert(formData);

        if (error) throw error;
      }

      // Reset form and reload patterns
      setFormData({
        pattern_type: 'block',
        category: 'security',
        pattern: '',
        description: '',
        severity: 'medium',
        action: 'block',
        replacement_text: '',
        block_message: '',
        applies_to_role: 'both',
      });
      setShowAddForm(false);
      setEditingPattern(null);
      await loadPatterns();
    } catch (error) {
      console.error('Error saving pattern:', error);
      alert('Failed to save pattern');
    }
  };

  const togglePatternStatus = async (pattern: FilterPattern) => {
    try {
      const { error } = await supabase
        .from('privacy_filter_patterns')
        .update({ is_active: !pattern.is_active })
        .eq('id', pattern.id);

      if (error) throw error;
      await loadPatterns();
    } catch (error) {
      console.error('Error toggling pattern:', error);
    }
  };

  const deletePattern = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pattern?')) return;
    
    try {
      const { error } = await supabase
        .from('privacy_filter_patterns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadPatterns();
    } catch (error) {
      console.error('Error deleting pattern:', error);
    }
  };

  const testPatterns = () => {
    const results: string[] = [];
    
    patterns.filter(p => p.is_active).forEach(pattern => {
      try {
        const regex = new RegExp(pattern.pattern, 'gi');
        if (regex.test(testMessage)) {
          results.push(`Matched: ${pattern.description} (${pattern.action})`);
        }
      } catch (e) {
        // Invalid regex
      }
    });

    setTestResults(results);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'block': return <Icons.Block className="w-4 h-4" />;
      case 'remove':
      case 'filter': return <Icons.Warning className="w-4 h-4" />;
      case 'warn': return <Icons.Info className="w-4 h-4" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p>Loading privacy filters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Icons.Shield className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold">Privacy Filter Management</h1>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Icons.Shield className="w-5 h-5" />
            Add New Pattern
          </button>
        </div>

        {/* Test Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Icons.Message className="w-5 h-5" />
            Test Patterns
          </h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg"
              placeholder="Enter a message to test against all active patterns..."
            />
            <button
              onClick={testPatterns}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Test
            </button>
          </div>
          {testResults.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-medium mb-2">Matches:</h3>
              <ul className="space-y-1">
                {testResults.map((result, idx) => (
                  <li key={idx} className="text-sm flex items-center gap-2">
                    <Icons.Warning className="w-4 h-4 text-yellow-600" />
                    {result}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingPattern) && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingPattern ? 'Edit Pattern' : 'Add New Pattern'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Pattern Type</label>
                <select
                  value={formData.pattern_type}
                  onChange={(e) => setFormData({ ...formData, pattern_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="block">Block</option>
                  <option value="filter">Filter</option>
                  <option value="warning">Warning</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="security">Security</option>
                  <option value="financial">Financial</option>
                  <option value="personal">Personal</option>
                  <option value="contact">Contact</option>
                  <option value="medical">Medical</option>
                  <option value="estate">Estate</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Pattern (Regex)</label>
                <input
                  type="text"
                  value={formData.pattern}
                  onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  placeholder="\\b\\d{3}-\\d{2}-\\d{4}\\b"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Social Security Number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Severity</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Action</label>
                <select
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="block">Block</option>
                  <option value="remove">Remove</option>
                  <option value="warn">Warn</option>
                </select>
              </div>

              {formData.action === 'remove' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Replacement Text</label>
                  <input
                    type="text"
                    value={formData.replacement_text}
                    onChange={(e) => setFormData({ ...formData, replacement_text: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="[REMOVED]"
                  />
                </div>
              )}

              {formData.action === 'block' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Block Message</label>
                  <input
                    type="text"
                    value={formData.block_message}
                    onChange={(e) => setFormData({ ...formData, block_message: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="This content is not allowed"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Applies To</label>
                <select
                  value={formData.applies_to_role}
                  onChange={(e) => setFormData({ ...formData, applies_to_role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="both">Both</option>
                  <option value="caregiver">Caregiver Only</option>
                  <option value="patient">Patient Only</option>
                </select>
              </div>

              <div className="col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingPattern(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingPattern ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Patterns Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pattern
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {patterns.map((pattern) => (
                <tr key={pattern.id} className={!pattern.is_active ? 'opacity-50' : ''}>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{pattern.description}</p>
                      <p className="text-xs text-gray-500 font-mono">{pattern.pattern.substring(0, 50)}...</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{pattern.category}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(pattern.severity)}`}>
                      {pattern.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      {getActionIcon(pattern.action)}
                      <span className="text-sm">{pattern.action}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{pattern.applies_to_role}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => togglePatternStatus(pattern)}
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        pattern.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {pattern.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingPattern(pattern);
                          setFormData({
                            pattern_type: pattern.pattern_type,
                            category: pattern.category,
                            pattern: pattern.pattern,
                            description: pattern.description,
                            severity: pattern.severity,
                            action: pattern.action,
                            replacement_text: pattern.replacement_text || '',
                            block_message: pattern.block_message || '',
                            applies_to_role: pattern.applies_to_role,
                          });
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePattern(pattern.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Patterns</p>
                <p className="text-2xl font-bold">{patterns.length}</p>
              </div>
              <Icons.Database className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold">{patterns.filter(p => p.is_active).length}</p>
              </div>
              <Icons.Check className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Block Rules</p>
                <p className="text-2xl font-bold">{patterns.filter(p => p.action === 'block').length}</p>
              </div>
              <Icons.Block className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Filter Rules</p>
                <p className="text-2xl font-bold">{patterns.filter(p => p.action === 'remove').length}</p>
              </div>
              <Icons.Warning className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}