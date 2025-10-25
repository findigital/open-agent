import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button, Input, toast, Loading } from '@afk/component';
import { useOrganizationOnboardingStore } from '@/store/organization-onboarding';
import { useProposalsStore } from '@/store/proposals';

interface BasicInfoStepProps {
  organizationId: string;
  onNext: () => void;
  onPrev: () => void;
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ organizationId, onNext, onPrev }) => {
  const { saveBasicInfo, skipOnboarding, loadOrganizationContext, organizationContext } = useOrganizationOnboardingStore();
  const { organizations } = useProposalsStore();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    taxId: '',
    type: '501(c)(3)',
    yearFounded: new Date().getFullYear() - 5,
    websiteUrl: '',
    email: '',
    phone: '',
    address: '',
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

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

  // Populate form when data is loaded
  useEffect(() => {
    const currentOrg = organizations.find(org => org.id === organizationId);

    if (currentOrg || organizationContext) {
      setFormData({
        name: currentOrg?.name || '',
        legalName: '',
        taxId: '',
        type: '501(c)(3)',
        yearFounded: organizationContext?.yearFounded || new Date().getFullYear() - 5,
        websiteUrl: currentOrg?.website || '',
        email: '',
        phone: '',
        address: '',
      });
    }
  }, [organizations, organizationContext, organizationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await saveBasicInfo(organizationId, formData);
      toast.success('Basic information saved!');
      onNext();
    } catch (error) {
      toast.error('Failed to save information');
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
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Organization Information</h2>
      <p className="text-gray-600 mb-8">Let's start with the basics about your organization.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name *</label>
            <Input
              value={formData.name}
              onChange={(val) => setFormData({ ...formData, name: val })}
              placeholder="Acme Nonprofit Foundation"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">EIN / Tax ID *</label>
            <Input
              value={formData.taxId}
              onChange={(val) => setFormData({ ...formData, taxId: val })}
              placeholder="12-3456789"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year Founded *</label>
            <Input
              type="number"
              value={formData.yearFounded.toString()}
              onChange={(val) => setFormData({ ...formData, yearFounded: parseInt(val) || 2000 })}
              required
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
            <Input
              value={formData.websiteUrl}
              onChange={(val) => setFormData({ ...formData, websiteUrl: val })}
              placeholder="https://example.org"
            />
            <p className="text-xs text-gray-500 mt-1">
              We can extract your mission and programs from your website automatically!
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email *</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(val) => setFormData({ ...formData, email: val })}
              placeholder="contact@example.org"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <Input
              value={formData.phone}
              onChange={(val) => setFormData({ ...formData, phone: val })}
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <Button onClick={onPrev} variant="outline" disabled={loading}>
            Back
          </Button>
          <div className="flex gap-3">
            <Button onClick={handleSkip} variant="text" className="text-gray-500" disabled={loading}>
              Skip for now
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
