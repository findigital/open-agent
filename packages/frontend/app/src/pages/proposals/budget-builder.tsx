import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@afk/component/Button';
import { gql } from '../../lib/gql';
import { toast } from 'sonner';
import {
  PlusIcon,
  TrashIcon,
  DownloadIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface BudgetLineItem {
  id: string;
  category: string;
  subcategory: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  justification?: string;
  funderAllowable?: boolean;
}

interface Budget {
  id: string;
  proposalId: string;
  lineItems: BudgetLineItem[];
  totalDirectCosts: number;
  indirectCosts: number;
  indirectRate: number;
  totalCosts: number;
  narrative?: string;
  status: string;
}

const BUDGET_CATEGORIES = [
  'Personnel',
  'Travel',
  'Equipment',
  'Supplies',
  'Contractual',
  'Other',
];

export function BudgetBuilder() {
  const { proposalId } = useParams<{ proposalId: string }>();
  const navigate = useNavigate();

  const [budget, setBudget] = useState<Budget | null>(null);
  const [lineItems, setLineItems] = useState<BudgetLineItem[]>([]);
  const [indirectRate, setIndirectRate] = useState<number>(0.10); // 10% default
  const [narrative, setNarrative] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);

  const [newItem, setNewItem] = useState<Partial<BudgetLineItem>>({
    category: 'Personnel',
    subcategory: '',
    description: '',
    quantity: 1,
    unitCost: 0,
  });

  useEffect(() => {
    if (proposalId) {
      loadBudget();
    }
  }, [proposalId]);

  // Recalculate totals when line items or indirect rate changes
  useEffect(() => {
    calculateTotals();
  }, [lineItems, indirectRate]);

  const loadBudget = async () => {
    try {
      setLoading(true);
      const res = await gql({
        query: `
          query GetBudget($proposalId: ID!) {
            budget(proposalId: $proposalId) {
              id
              proposalId
              lineItems
              totalDirectCosts
              indirectCosts
              indirectRate
              totalCosts
              narrative
              status
            }
          }
        `,
        variables: { proposalId },
      });

      if (res.data?.budget) {
        setBudget(res.data.budget);
        setLineItems(res.data.budget.lineItems || []);
        setIndirectRate(res.data.budget.indirectRate || 0.10);
        setNarrative(res.data.budget.narrative || '');
      }
    } catch (error) {
      console.error('Failed to load budget:', error);
      // Budget doesn't exist yet - start fresh
      setLineItems([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const totalDirectCosts = lineItems.reduce((sum, item) => sum + item.totalCost, 0);

    // Calculate MTDC (excludes equipment > $5000)
    const mtdc = lineItems
      .filter(item => !(item.category === 'Equipment' && item.unitCost > 5000))
      .reduce((sum, item) => sum + item.totalCost, 0);

    const indirectCosts = mtdc * indirectRate;
    const totalCosts = totalDirectCosts + indirectCosts;

    return {
      totalDirectCosts: Math.round(totalDirectCosts * 100) / 100,
      indirectCosts: Math.round(indirectCosts * 100) / 100,
      totalCosts: Math.round(totalCosts * 100) / 100,
    };
  };

  const addLineItem = () => {
    if (!newItem.description || !newItem.quantity || newItem.unitCost === undefined) {
      toast.error('Please fill in all required fields');
      return;
    }

    const totalCost = (newItem.quantity || 0) * (newItem.unitCost || 0);

    const item: BudgetLineItem = {
      id: `item-${Date.now()}`,
      category: newItem.category || 'Personnel',
      subcategory: newItem.subcategory || '',
      description: newItem.description || '',
      quantity: newItem.quantity || 1,
      unitCost: newItem.unitCost || 0,
      totalCost: Math.round(totalCost * 100) / 100,
      justification: newItem.justification,
    };

    setLineItems([...lineItems, item]);

    // Reset form
    setNewItem({
      category: 'Personnel',
      subcategory: '',
      description: '',
      quantity: 1,
      unitCost: 0,
    });

    toast.success('Line item added');
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
    toast.success('Line item removed');
  };

  const updateLineItem = (id: string, updates: Partial<BudgetLineItem>) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        // Recalculate total cost if quantity or unit cost changed
        if (updates.quantity !== undefined || updates.unitCost !== undefined) {
          updated.totalCost = Math.round(updated.quantity * updated.unitCost * 100) / 100;
        }
        return updated;
      }
      return item;
    }));
  };

  const saveBudget = async () => {
    try {
      setSaving(true);
      const totals = calculateTotals();

      const mutation = budget
        ? 'updateBudget'
        : 'createBudget';

      const variables = budget
        ? {
            budgetId: budget.id,
            input: {
              lineItems,
              indirectRate,
              narrative,
            },
          }
        : {
            input: {
              proposalId,
              lineItems,
              indirectRate,
              narrative,
            },
          };

      const res = await gql({
        query: `
          mutation ${mutation === 'createBudget' ? 'CreateBudget' : 'UpdateBudget'}($${budget ? 'budgetId: ID!, ' : ''}input: ${mutation === 'createBudget' ? 'CreateBudgetInput' : 'UpdateBudgetInput'}!) {
            ${mutation}(${budget ? 'budgetId: $budgetId, ' : ''}input: $input) {
              id
              proposalId
              lineItems
              totalDirectCosts
              indirectCosts
              totalCosts
              narrative
              status
            }
          }
        `,
        variables,
      });

      if (res.data?.[mutation]) {
        setBudget(res.data[mutation]);
        toast.success('Budget saved successfully');
      }
    } catch (error) {
      console.error('Failed to save budget:', error);
      toast.error('Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  const generateWithAI = async () => {
    try {
      setGeneratingAI(true);
      const res = await gql({
        query: `
          mutation GenerateBudget($input: GenerateBudgetInput!) {
            generateBudget(input: $input) {
              budgetId
              lineItems
              totalDirectCosts
              indirectCosts
              totalCosts
              narrative
              warnings
              iterations
            }
          }
        `,
        variables: {
          input: {
            proposalId,
            grantType: 'federal', // This should come from proposal metadata
            projectDuration: 12,
          },
        },
      });

      if (res.data?.generateBudget) {
        setLineItems(res.data.generateBudget.lineItems);
        setNarrative(res.data.generateBudget.narrative);
        toast.success(`Budget generated successfully (${res.data.generateBudget.iterations} iterations)`);

        if (res.data.generateBudget.warnings?.length > 0) {
          setValidationIssues(res.data.generateBudget.warnings);
        }
      }
    } catch (error) {
      console.error('Failed to generate budget:', error);
      toast.error('Failed to generate budget with AI');
    } finally {
      setGeneratingAI(false);
    }
  };

  const validateBudget = async () => {
    try {
      const res = await gql({
        query: `
          mutation ValidateBudget($budgetId: ID!, $grantType: String!) {
            validateBudget(budgetId: $budgetId, grantType: $grantType) {
              isValid
              issues
              standards {
                category
                guideline
                ombReference
              }
            }
          }
        `,
        variables: {
          budgetId: budget?.id,
          grantType: 'federal',
        },
      });

      if (res.data?.validateBudget) {
        if (res.data.validateBudget.isValid) {
          toast.success('Budget is compliant with all standards');
          setValidationIssues([]);
        } else {
          setValidationIssues(res.data.validateBudget.issues);
          toast.warning(`Found ${res.data.validateBudget.issues.length} compliance issues`);
        }
      }
    } catch (error) {
      console.error('Failed to validate budget:', error);
      toast.error('Failed to validate budget');
    }
  };

  const exportBudget = async (format: 'csv' | 'excel' | 'narrative') => {
    if (!budget) {
      toast.error('Please save budget first');
      return;
    }

    try {
      const res = await fetch(`/api/budgets/${budget.id}/export?format=${format}`, {
        method: 'GET',
      });

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budget-${proposalId}.${format === 'excel' ? 'xlsx' : format === 'csv' ? 'csv' : 'txt'}`;
      a.click();

      toast.success(`Budget exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export budget');
    }
  };

  const totals = calculateTotals();

  // Group line items by category
  const groupedItems = lineItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, BudgetLineItem[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading budget...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Budget Builder</h1>
            <p className="mt-2 text-gray-600">Create and manage your proposal budget</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate(`/proposals/${proposalId}`)}
              variant="secondary"
            >
              Back to Proposal
            </Button>
            <Button
              onClick={generateWithAI}
              disabled={generatingAI}
              className="flex items-center gap-2"
            >
              <SparklesIcon className="w-5 h-5" />
              {generatingAI ? 'Generating...' : 'Generate with AI'}
            </Button>
            {budget && (
              <Button onClick={validateBudget} variant="secondary">
                Validate Budget
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Validation Issues */}
      {validationIssues.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-2">Compliance Issues Found</h3>
              <ul className="space-y-1 text-sm text-yellow-800">
                {validationIssues.map((issue, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-yellow-600">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Budget Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add Line Item Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Add Line Item</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {BUDGET_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subcategory
                </label>
                <input
                  type="text"
                  value={newItem.subcategory || ''}
                  onChange={(e) => setNewItem({ ...newItem, subcategory: e.target.value })}
                  placeholder="e.g., Program Director"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  value={newItem.description || ''}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="e.g., Program Director - 50% FTE"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  value={newItem.quantity || 1}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 1 })}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Cost * ($)
                </label>
                <input
                  type="number"
                  value={newItem.unitCost || 0}
                  onChange={(e) => setNewItem({ ...newItem, unitCost: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Justification
                </label>
                <textarea
                  value={newItem.justification || ''}
                  onChange={(e) => setNewItem({ ...newItem, justification: e.target.value })}
                  placeholder="Explain why this expense is necessary..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="col-span-2">
                <Button onClick={addLineItem} className="w-full flex items-center justify-center gap-2">
                  <PlusIcon className="w-5 h-5" />
                  Add Line Item
                </Button>
              </div>
            </div>
          </div>

          {/* Line Items by Category */}
          {BUDGET_CATEGORIES.map(category => {
            const items = groupedItems[category] || [];
            if (items.length === 0) return null;

            const categoryTotal = items.reduce((sum, item) => sum + item.totalCost, 0);

            return (
              <div key={category} className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {items.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{item.description}</p>
                              {item.subcategory && (
                                <p className="text-xs text-gray-500">{item.subcategory}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            ${item.unitCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                            ${item.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => removeLineItem(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={3} className="px-4 py-3 text-right text-sm text-gray-700">
                          {category} Subtotal:
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          ${categoryTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Budget Narrative */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Budget Narrative</h2>
            <textarea
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Provide a detailed explanation of your budget items and how they support the project goals..."
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Budget Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Budget Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-sm text-gray-600">Total Direct Costs</span>
                <span className="text-lg font-semibold text-gray-900">
                  ${totals.totalDirectCosts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Indirect Cost Rate (%)
                </label>
                <input
                  type="number"
                  value={(indirectRate * 100).toFixed(1)}
                  onChange={(e) => setIndirectRate(parseFloat(e.target.value) / 100 || 0.10)}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500">
                  Default: 10% de minimis rate
                </p>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-sm text-gray-600">Indirect Costs ({(indirectRate * 100).toFixed(1)}%)</span>
                <span className="text-lg font-semibold text-gray-900">
                  ${totals.indirectCosts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center pt-3">
                <span className="text-base font-bold text-gray-900">TOTAL PROJECT COSTS</span>
                <span className="text-2xl font-bold text-blue-600">
                  ${totals.totalCosts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-y-3">
              <Button
                onClick={saveBudget}
                disabled={saving || lineItems.length === 0}
                className="w-full"
              >
                {saving ? 'Saving...' : budget ? 'Update Budget' : 'Save Budget'}
              </Button>

              {budget && (
                <>
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Export Budget</p>
                    <div className="space-y-2">
                      <Button
                        onClick={() => exportBudget('excel')}
                        variant="secondary"
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <DownloadIcon className="w-4 h-4" />
                        Export Excel
                      </Button>
                      <Button
                        onClick={() => exportBudget('csv')}
                        variant="secondary"
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <DownloadIcon className="w-4 h-4" />
                        Export CSV
                      </Button>
                      <Button
                        onClick={() => exportBudget('narrative')}
                        variant="secondary"
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <DownloadIcon className="w-4 h-4" />
                        Export Narrative
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Budget Standards */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Budget Standards</h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Personnel costs include salaries + fringe benefits</li>
              <li>• Equipment threshold: $5,000</li>
              <li>• Indirect costs applied to MTDC</li>
              <li>• International travel requires prior approval</li>
              <li>• All costs must be reasonable and allocable</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
