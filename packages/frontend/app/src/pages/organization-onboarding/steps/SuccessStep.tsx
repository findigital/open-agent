import { Button } from '@afk/component';
import { useNavigate } from 'react-router';

interface SuccessStepProps {
  organizationId: string;
}

export const SuccessStep: React.FC<SuccessStepProps> = ({ organizationId }) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto text-center py-16">
      <div className="mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">You're All Set! 🎉</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Your organization profile is complete. We now have the context needed to write compelling grant proposals
          tailored to your mission.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">What's Next?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-4 border border-gray-100 rounded-lg">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path
                  fillRule="evenodd"
                  d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-sm mb-1">Create Proposals</h3>
            <p className="text-xs text-gray-600">Start from templates or import RFPs</p>
          </div>

          <div className="p-4 border border-gray-100 rounded-lg">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
            <h3 className="font-semibold text-sm mb-1">Search Grants</h3>
            <p className="text-xs text-gray-600">Find funding opportunities</p>
          </div>

          <div className="p-4 border border-gray-100 rounded-lg">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                <path
                  fillRule="evenodd"
                  d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-sm mb-1">Upload Documents</h3>
            <p className="text-xs text-gray-600">Add more context anytime</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <Button
          onClick={() => navigate('/proposals')}
          variant="primary"
          size="large"
          style={{ height: 48, fontSize: 16, fontWeight: 600, minWidth: 200 }}
        >
          Go to Dashboard
        </Button>
        <Button
          onClick={() => navigate('/proposals/create')}
          variant="outline"
          size="large"
          style={{ height: 48, fontSize: 16, fontWeight: 600 }}
        >
          Create First Proposal
        </Button>
      </div>
    </div>
  );
};
