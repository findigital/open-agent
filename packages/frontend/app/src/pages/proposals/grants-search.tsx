import {
  Button,
  IconButton,
  Input,
  Loading,
  Select,
  toast,
} from '@afk/component';
import {
  ArrowRightIcon,
  FilterIcon,
  LinkIcon,
  SearchIcon,
} from '@blocksuite/icons/rc';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { cn } from '@/lib/utils';
import { gql } from '@/lib/gql';

import { AutoSidebarPadding } from '../layout/auto-sidebar-padding';

interface Grant {
  id: string;
  title: string;
  funderName: string;
  description: string;
  eligibility: string;
  category: string;
  keywords: string[];
  minAmount?: number;
  maxAmount?: number;
  openDate?: string;
  closeDate?: string;
  url?: string;
}

const categoryColors = {
  education: 'bg-blue-100 text-blue-700',
  environment: 'bg-green-100 text-green-700',
  health: 'bg-red-100 text-red-700',
  arts: 'bg-purple-100 text-purple-700',
  community: 'bg-orange-100 text-orange-700',
  research: 'bg-indigo-100 text-indigo-700',
  general: 'bg-gray-100 text-gray-700',
};

const GrantCard = ({ grant, onCreateProposal }: { grant: Grant; onCreateProposal: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const categoryColor = categoryColors[grant.category as keyof typeof categoryColors] || categoryColors.general;

  const isOpen = !grant.closeDate || dayjs(grant.closeDate).isAfter(dayjs());
  const daysLeft = grant.closeDate ? dayjs(grant.closeDate).diff(dayjs(), 'day') : null;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0;

  return (
    <div className="border border-gray-200 rounded-lg p-5 bg-white hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold flex-1 pr-4">{grant.title}</h3>
          {!isOpen && (
            <span className="text-xs font-medium px-2 py-1 bg-gray-200 text-gray-600 rounded">
              Closed
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 font-medium">{grant.funderName}</p>
      </div>

      {/* Amount & Category */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {(grant.minAmount || grant.maxAmount) && (
          <div className="text-sm font-semibold text-gray-900">
            {grant.minAmount && grant.maxAmount ? (
              `$${grant.minAmount.toLocaleString()} - $${grant.maxAmount.toLocaleString()}`
            ) : grant.maxAmount ? (
              `Up to $${grant.maxAmount.toLocaleString()}`
            ) : grant.minAmount ? (
              `From $${grant.minAmount.toLocaleString()}`
            ) : null}
          </div>
        )}
        <span className={cn('text-xs font-medium px-2 py-1 rounded', categoryColor)}>
          {grant.category}
        </span>
      </div>

      {/* Deadline */}
      {grant.closeDate && isOpen && (
        <div className={cn(
          'text-sm mb-3',
          isExpiringSoon ? 'text-red-600 font-medium' : 'text-gray-600'
        )}>
          {isExpiringSoon && '⚠️ '}
          Deadline: {dayjs(grant.closeDate).format('MMM D, YYYY')}
          {daysLeft !== null && daysLeft >= 0 && (
            <span className="ml-1">({daysLeft} {daysLeft === 1 ? 'day' : 'days'} left)</span>
          )}
        </div>
      )}

      {/* Description */}
      <p className={cn(
        'text-sm text-gray-700 mb-3',
        !expanded && 'line-clamp-3'
      )}>
        {grant.description}
      </p>

      {/* Expanded Content */}
      {expanded && (
        <div className="space-y-3 mb-3">
          {grant.eligibility && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1">Eligibility:</h4>
              <p className="text-sm text-gray-600">{grant.eligibility}</p>
            </div>
          )}
          {grant.keywords.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1">Keywords:</h4>
              <div className="flex flex-wrap gap-1">
                {grant.keywords.map(keyword => (
                  <span
                    key={keyword}
                    className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
          {grant.openDate && (
            <div className="text-xs text-gray-500">
              Opens: {dayjs(grant.openDate).format('MMM D, YYYY')}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        <Button
          size="small"
          variant="secondary"
          onClick={() => setExpanded(!expanded)}
          className="flex-1"
        >
          {expanded ? 'Show Less' : 'Show More'}
        </Button>
        {grant.url && (
          <IconButton
            onClick={() => window.open(grant.url, '_blank')}
            title="Open grant page"
          >
            <LinkIcon className="w-4 h-4" />
          </IconButton>
        )}
        <Button
          size="small"
          onClick={onCreateProposal}
          disabled={!isOpen}
          className="flex items-center gap-1"
        >
          Create Proposal
          <ArrowRightIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export const GrantsSearch = () => {
  const navigate = useNavigate();

  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [openOnly, setOpenOnly] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const searchGrants = useCallback(async () => {
    setLoading(true);
    try {
      const keywords = searchQuery.trim() ? searchQuery.split(' ').filter(Boolean) : undefined;

      const res = await gql({
        query: `
          query SearchGrants(
            $keywords: [String!]
            $category: [GrantCategory!]
            $minAmount: Float
            $maxAmount: Float
            $openOnly: Boolean
            $limit: Int
          ) {
            searchGrants(
              keywords: $keywords
              category: $category
              minAmount: $minAmount
              maxAmount: $maxAmount
              openOnly: $openOnly
              limit: $limit
            ) {
              id
              title
              funderName
              description
              eligibility
              category
              keywords
              minAmount
              maxAmount
              openDate
              closeDate
              url
            }
          }
        `,
        variables: {
          keywords,
          category: categoryFilter !== 'all' ? [categoryFilter.toUpperCase()] : undefined,
          minAmount: minAmount ? parseFloat(minAmount) : undefined,
          maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
          openOnly,
          limit: 50,
        },
      });

      if (res.data?.searchGrants) {
        setGrants(res.data.searchGrants);
      }
    } catch (error) {
      console.error('Failed to search grants:', error);
      toast.error('Failed to search grants. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, minAmount, maxAmount, openOnly]);

  useEffect(() => {
    searchGrants();
  }, [searchGrants]);

  const handleCreateProposal = (grant: Grant) => {
    // Navigate to create proposal with grant pre-selected
    navigate(`/proposals/new?grantId=${grant.id}`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setMinAmount('');
    setMaxAmount('');
    setOpenOnly(true);
  };

  const activeFilterCount = [
    searchQuery.trim(),
    categoryFilter !== 'all',
    minAmount,
    maxAmount,
    !openOnly,
  ].filter(Boolean).length;

  return (
    <AutoSidebarPadding className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Grant Opportunities</h1>
            <p className="text-sm text-gray-600 mt-1">
              Find funding opportunities for your organization
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && searchGrants()}
            placeholder="Search grants by keywords (e.g., 'education environment youth')..."
            className="w-full pl-10 pr-24"
          />
          <Button
            onClick={searchGrants}
            className="absolute right-1 top-1/2 transform -translate-y-1/2"
            size="small"
          >
            Search
          </Button>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters ? 'primary' : 'secondary'}
            size="small"
            className="flex items-center gap-1"
          >
            <FilterIcon className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                {activeFilterCount}
              </span>
            )}
          </Button>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={e => setOpenOnly(e.target.checked)}
              className="rounded"
            />
            Open grants only
          </label>

          {activeFilterCount > 0 && (
            <Button onClick={clearFilters} variant="plain" size="small">
              Clear all filters
            </Button>
          )}

          <div className="ml-auto text-sm text-gray-600">
            {grants.length} {grants.length === 1 ? 'grant' : 'grants'} found
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Category
              </label>
              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
                className="w-full"
              >
                <option value="all">All Categories</option>
                <option value="education">Education</option>
                <option value="environment">Environment</option>
                <option value="health">Health</option>
                <option value="arts">Arts & Culture</option>
                <option value="community">Community</option>
                <option value="research">Research</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Min Amount ($)
              </label>
              <Input
                type="number"
                value={minAmount}
                onChange={e => setMinAmount(e.target.value)}
                placeholder="e.g., 10000"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Max Amount ($)
              </label>
              <Input
                type="number"
                value={maxAmount}
                onChange={e => setMaxAmount(e.target.value)}
                placeholder="e.g., 100000"
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loading className="text-2xl" />
            <span className="ml-3 text-gray-600">Searching for grants...</span>
          </div>
        ) : grants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <SearchIcon className="text-[97px] text-gray-300" />
            <p className="text-lg font-medium mt-4">No grants found</p>
            <p className="text-sm text-gray-500 mt-1 text-center max-w-md">
              Try adjusting your search terms or filters to find more opportunities
            </p>
            {activeFilterCount > 0 && (
              <Button onClick={clearFilters} className="mt-4" variant="secondary">
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {grants.map(grant => (
              <GrantCard
                key={grant.id}
                grant={grant}
                onCreateProposal={() => handleCreateProposal(grant)}
              />
            ))}
          </div>
        )}
      </div>
    </AutoSidebarPadding>
  );
};
