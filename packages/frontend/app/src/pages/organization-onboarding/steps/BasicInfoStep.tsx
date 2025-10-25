import { useState } from 'react';
import { Button, Input, toast } from '@afk/component';
import { useOrganizationOnboardingStore } from '@/store/organization-onboarding';

interface BasicInfoStepProps {
  organizationId: string;
  onNext: () => void;
  onPrev: () => void;
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ organizationId, onNext, onPrev }) => {
  const { saveBasicInfo } = useOrganizationOnboardingStore();

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
          <Button onClick={onPrev} variant="outline">
            Back
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </form>
    </div>
  );
};
