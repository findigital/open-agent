import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button, Input, toast, Loading } from '@afk/component';
import { useOrganizationOnboardingStore } from '@/store/organization-onboarding';
import { cn } from '@/lib/utils';

interface ProgramsStepProps {
  organizationId: string;
  onNext: () => void;
  onPrev: () => void;
}

interface ProgramData {
  name: string;
  description: string;
  needAddressed?: string;
  howAddressesNeed?: string;
  targetPopulation?: string;
  outcomes: string[];
  needEvidence: Array<{ statistic: string; source: string }>;
  participantsServed?: number;
  budget?: number;
}

interface NeedEvidenceItem {
  statistic: string;
  source: string;
}

const emptyProgram: ProgramData = {
  name: '',
  description: '',
  needAddressed: '',
  howAddressesNeed: '',
  targetPopulation: '',
  outcomes: [],
  needEvidence: [],
  participantsServed: undefined,
  budget: undefined,
};

export const ProgramsStep: React.FC<ProgramsStepProps> = ({ organizationId, onNext, onPrev }) => {
  const { addProgram, qualityScore, skipOnboarding, loadOrganizationContext, organizationContext } = useOrganizationOnboardingStore();
  const navigate = useNavigate();

  const [programs, setPrograms] = useState<ProgramData[]>([]);
  const [currentProgram, setCurrentProgram] = useState<ProgramData>(emptyProgram);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // For outcomes array (comma-separated input)
  const [outcomesInput, setOutcomesInput] = useState('');

  // For need evidence
  const [evidenceStatistic, setEvidenceStatistic] = useState('');
  const [evidenceSource, setEvidenceSource] = useState('');

  // Load existing data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setInitialLoading(true);
        await loadOrganizationContext(organizationId);
      } catch (error) {
        console.error('Failed to load organization context:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadData();
  }, [organizationId, loadOrganizationContext]);

  // Populate programs when data is loaded
  useEffect(() => {
    if (organizationContext && organizationContext.programs) {
      const loadedPrograms = Array.isArray(organizationContext.programs)
        ? organizationContext.programs
        : [];
      setPrograms(loadedPrograms);
    }
  }, [organizationContext]);

  const handleAddEvidence = () => {
    if (!evidenceStatistic || !evidenceSource) {
      toast.error('Please fill in both statistic and source');
      return;
    }

    setCurrentProgram({
      ...currentProgram,
      needEvidence: [...currentProgram.needEvidence, { statistic: evidenceStatistic, source: evidenceSource }],
    });

    setEvidenceStatistic('');
    setEvidenceSource('');
    toast.success('Evidence added');
  };

  const handleRemoveEvidence = (index: number) => {
    setCurrentProgram({
      ...currentProgram,
      needEvidence: currentProgram.needEvidence.filter((_, i) => i !== index),
    });
  };

  const handleAddProgram = () => {
    if (!currentProgram.name || !currentProgram.description) {
      toast.error('Please provide at least a program name and description');
      return;
    }

    // Parse outcomes from comma-separated input
    const outcomes = outcomesInput
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    const programToAdd = {
      ...currentProgram,
      outcomes,
    };

    if (editingIndex !== null) {
      // Update existing program
      const updated = [...programs];
      updated[editingIndex] = programToAdd;
      setPrograms(updated);
      setEditingIndex(null);
      toast.success('Program updated');
    } else {
      // Add new program
      setPrograms([...programs, programToAdd]);
      toast.success('Program added');
    }

    // Reset form
    setCurrentProgram(emptyProgram);
    setOutcomesInput('');
  };

  const handleEditProgram = (index: number) => {
    setCurrentProgram(programs[index]);
    setOutcomesInput(programs[index].outcomes.join(', '));
    setEditingIndex(index);
  };

  const handleDeleteProgram = (index: number) => {
    setPrograms(programs.filter((_, i) => i !== index));
    toast.success('Program removed');
  };

  const handleNext = async () => {
    if (programs.length === 0) {
      toast.error('Please add at least one program');
      return;
    }

    setLoading(true);

    try {
      // Save all programs
      for (const program of programs) {
        await addProgram(organizationId, program);
      }

      toast.success(`${programs.length} program(s) saved!`);
      onNext();
    } catch (error) {
      toast.error('Failed to save programs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await skipOnboarding(organizationId);
    toast.info('Progress saved! You can resume anytime from your organization profile.');
    navigate('/proposals');
  };

  if (initialLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 flex items-center justify-center min-h-[400px]">
        <Loading />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Programs & Services</h2>
      <p className="text-gray-600 mb-6">
        Add your programs and services. For each, describe the specific need it addresses and how it creates impact.
      </p>

      {/* Help text */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-900">
          <strong>💡 Tip:</strong> Focus on program-specific needs with data. For example: "65% of 3rd graders in our
          district read below grade level (District Assessment 2024)"
        </p>
      </div>

      {/* Added Programs List */}
      {programs.length > 0 && (
        <div className="mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">Added Programs ({programs.length})</h3>
          <div className="space-y-3">
            {programs.map((program, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{program.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{program.description}</p>
                    {program.needAddressed && (
                      <p className="text-xs text-blue-700 mt-2">
                        <strong>Need:</strong> {program.needAddressed}
                      </p>
                    )}
                    {program.outcomes.length > 0 && (
                      <p className="text-xs text-green-700 mt-1">
                        <strong>Outcomes:</strong> {program.outcomes.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEditProgram(index)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProgram(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Program Form */}
      <div className="space-y-6 border-t border-gray-200 pt-6">
        <h3 className="font-semibold text-gray-900">
          {editingIndex !== null ? 'Edit Program' : 'Add Program'}
        </h3>

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Program Name *</label>
            <Input
              value={currentProgram.name}
              onChange={(value) => setCurrentProgram({ ...currentProgram, name: value })}
              placeholder="e.g., After-School Tutoring Program"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">{currentProgram.name.length}/100</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Population</label>
            <Input
              value={currentProgram.targetPopulation || ''}
              onChange={(value) => setCurrentProgram({ ...currentProgram, targetPopulation: value })}
              placeholder="e.g., Low-income youth ages 12-18"
              maxLength={200}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Program Description *</label>
          <textarea
            value={currentProgram.description}
            onChange={(e) => setCurrentProgram({ ...currentProgram, description: e.target.value })}
            placeholder="Describe what this program does, how it works, and who it serves..."
            className="w-full border border-gray-300 rounded-lg p-3 min-h-[100px]"
            maxLength={800}
            required
          />
          <p className="text-xs text-gray-500 mt-1">{currentProgram.description.length}/800</p>
        </div>

        {/* Needs Section */}
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-3">Program-Specific Need ⭐</h4>

          <div className="mb-4">
            <label className="block text-sm font-medium text-blue-900 mb-2">What need does this program address?</label>
            <textarea
              value={currentProgram.needAddressed || ''}
              onChange={(e) => setCurrentProgram({ ...currentProgram, needAddressed: e.target.value })}
              placeholder="e.g., 65% of 3rd graders in our district read below grade level, limiting their academic success..."
              className="w-full border border-blue-300 rounded-lg p-3 min-h-[80px]"
              maxLength={500}
            />
            <p className="text-xs text-blue-700 mt-1">{(currentProgram.needAddressed || '').length}/500</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-blue-900 mb-2">How does this program address the need?</label>
            <textarea
              value={currentProgram.howAddressesNeed || ''}
              onChange={(e) => setCurrentProgram({ ...currentProgram, howAddressesNeed: e.target.value })}
              placeholder="e.g., Provides evidence-based 1-on-1 literacy instruction 3x/week using trained tutors..."
              className="w-full border border-blue-300 rounded-lg p-3 min-h-[80px]"
              maxLength={500}
            />
            <p className="text-xs text-blue-700 mt-1">{(currentProgram.howAddressesNeed || '').length}/500</p>
          </div>

          {/* Evidence */}
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-2">
              Supporting Evidence (Data/Statistics)
            </label>

            {currentProgram.needEvidence.length > 0 && (
              <div className="mb-3 space-y-2">
                {currentProgram.needEvidence.map((evidence, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs bg-white p-2 rounded border border-blue-200">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{evidence.statistic}</div>
                      <div className="text-gray-600">Source: {evidence.source}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveEvidence(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Input
                value={evidenceStatistic}
                onChange={setEvidenceStatistic}
                placeholder="Statistic/Data"
              />
              <Input
                value={evidenceSource}
                onChange={setEvidenceSource}
                placeholder="Source"
              />
            </div>
            <Button onClick={handleAddEvidence} variant="outline" size="small" className="mt-2">
              + Add Evidence
            </Button>
          </div>
        </div>

        {/* Outcomes & Impact */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Outcomes (comma-separated)
          </label>
          <Input
            value={outcomesInput}
            onChange={setOutcomesInput}
            placeholder="e.g., 85% improve reading by 1+ grade level, 90% attendance rate"
            maxLength={300}
          />
          <p className="text-xs text-gray-500 mt-1">
            Separate multiple outcomes with commas
          </p>
        </div>

        {/* Capacity Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Participants Served (annually)</label>
            <Input
              type="number"
              value={currentProgram.participantsServed?.toString() || ''}
              onChange={(value) =>
                setCurrentProgram({ ...currentProgram, participantsServed: value ? parseInt(value) : undefined })
              }
              placeholder="e.g., 150"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Annual Budget ($)</label>
            <Input
              type="number"
              value={currentProgram.budget?.toString() || ''}
              onChange={(value) =>
                setCurrentProgram({ ...currentProgram, budget: value ? parseInt(value) : undefined })
              }
              placeholder="e.g., 75000"
            />
          </div>
        </div>

        <Button onClick={handleAddProgram} variant="primary" className="w-full">
          {editingIndex !== null ? 'Update Program' : '+ Add Program'}
        </Button>
      </div>

      {/* Navigation */}
      <div className="pt-6 border-t border-gray-200 mt-8">
        <div className="flex items-center justify-center mb-4 text-sm text-gray-600">
          {programs.length} program{programs.length !== 1 ? 's' : ''} added
          {qualityScore && ` • Quality Score: ${qualityScore.overall}/100`}
        </div>
        <div className="flex items-center justify-between">
          <Button onClick={onPrev} variant="outline" disabled={loading}>
            Back
          </Button>
          <div className="flex gap-3">
            <Button onClick={handleSkip} variant="text" className="text-gray-500" disabled={loading}>
              Skip for now
            </Button>
            <Button onClick={handleNext} variant="primary" disabled={loading || programs.length === 0}>
              {loading ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
