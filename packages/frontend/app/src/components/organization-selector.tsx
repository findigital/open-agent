import { Select } from '@afk/component';
import { useEffect } from 'react';
import { useProposalsStore, type Organization } from '@/store/proposals';

interface OrganizationSelectorProps {
  value?: string;
  onChange?: (organizationId: string, organization: Organization) => void;
  className?: string;
  disabled?: boolean;
}

export const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  value,
  onChange,
  className,
  disabled = false,
}) => {
  const {
    organizations,
    currentOrganization,
    initialized,
    loading,
    refreshOrganizations,
    setCurrentOrganization,
  } = useProposalsStore();

  // Load organizations on mount if not already loaded
  useEffect(() => {
    if (!initialized && !loading) {
      refreshOrganizations();
    }
  }, [initialized, loading, refreshOrganizations]);

  // If value is controlled, find and set the organization
  useEffect(() => {
    if (value && organizations.length > 0) {
      const org = organizations.find(o => o.id === value);
      if (org && org.id !== currentOrganization?.id) {
        setCurrentOrganization(org);
      }
    }
  }, [value, organizations, currentOrganization, setCurrentOrganization]);

  const handleChange = (organizationId: string) => {
    const org = organizations.find(o => o.id === organizationId);
    if (org) {
      setCurrentOrganization(org);
      if (onChange) {
        onChange(organizationId, org);
      }
    }
  };

  const selectedValue = value || currentOrganization?.id || '';

  if (organizations.length === 0 && !loading) {
    return (
      <div className={className}>
        <p className="text-sm text-gray-500 italic">No organizations found</p>
      </div>
    );
  }

  return (
    <Select
      value={selectedValue}
      onValueChange={handleChange}
      placeholder="Select organization"
      className={className}
      disabled={disabled || loading}
    >
      {organizations.map(org => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </Select>
  );
};
