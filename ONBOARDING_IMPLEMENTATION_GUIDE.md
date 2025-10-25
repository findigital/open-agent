# Organization Onboarding - Implementation Guide

This guide shows exactly what code to add for skip/resume functionality and contextual triggers.

---

## 1. Enhanced Store with Skip/Resume

**File:** `packages/frontend/app/src/store/organization-onboarding.ts`

### Add to interface:

```typescript
export interface OrganizationOnboardingState {
  // ... existing fields ...

  // NEW: Skip/Resume functionality
  canSkip: boolean;
  lastDismissedAt: Date | null;
  dismissalCount: number;

  // NEW: Actions
  skipOnboarding: (organizationId: string, context: string) => Promise<void>;
  resumeOnboarding: (organizationId: string) => Promise<void>;
  dismissBanner: (organizationId: string, context: string) => Promise<void>;
  shouldShowBanner: (context: string) => boolean;
}
```

### Add to implementation:

```typescript
export const useOrganizationOnboardingStore = create<OrganizationOnboardingState>((set, get) => ({
  // ... existing state ...
  canSkip: true,
  lastDismissedAt: null,
  dismissalCount: 0,

  skipOnboarding: async (organizationId: string, context: string) => {
    // Save current progress
    const { currentStep } = get();

    await gql({
      query: `
        mutation SkipOnboarding($organizationId: ID!, $currentStep: Int!, $context: String!) {
          skipOnboarding(
            organizationId: $organizationId
            currentStep: $currentStep
            context: $context
          ) {
            id
            currentStep
            status
          }
        }
      `,
      variables: { organizationId, currentStep, context },
    });

    set({ lastDismissedAt: new Date() });
  },

  resumeOnboarding: async (organizationId: string) => {
    // Load saved progress
    await get().loadProgress(organizationId);
    await get().loadQualityScore(organizationId);
  },

  dismissBanner: async (organizationId: string, context: string) => {
    const { dismissalCount } = get();

    await gql({
      query: `
        mutation DismissBanner($organizationId: ID!, $context: String!) {
          dismissOnboardingBanner(
            organizationId: $organizationId
            context: $context
          )
        }
      `,
      variables: { organizationId, context },
    });

    set({
      dismissalCount: dismissalCount + 1,
      lastDismissedAt: new Date()
    });
  },

  shouldShowBanner: (context: string) => {
    const { dismissalCount, lastDismissedAt, progress, qualityScore } = get();

    // Don't show if permanently dismissed (3+ times)
    if (dismissalCount >= 3) return false;

    // Don't show if dismissed in last 7 days
    if (lastDismissedAt) {
      const daysSinceDismiss = (Date.now() - lastDismissedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < 7) return false;
    }

    // Don't show if already complete
    if (progress?.isComplete) return false;

    // Don't show if quality score is good
    if (qualityScore && qualityScore.overall >= 75) return false;

    return true;
  },
}));
```

---

## 2. Add Skip Button to All Steps

**Example for MissionNeedsStep:**

```typescript
export const MissionNeedsStep: React.FC<MissionNeedsStepProps> = ({
  organizationId,
  onNext,
  onPrev
}) => {
  const { skipOnboarding } = useOrganizationOnboardingStore();
  const navigate = useNavigate();

  const handleSkip = async () => {
    await skipOnboarding(organizationId, 'step_skip');
    toast.info('Progress saved! You can resume anytime from Settings.');
    navigate('/proposals'); // Or wherever makes sense
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      {/* ... existing content ... */}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-8">
        <Button onClick={onPrev} variant="outline" disabled={loading}>
          Back
        </Button>

        {/* NEW: Skip button */}
        <Button onClick={handleSkip} variant="text" className="text-gray-500">
          Skip for now
        </Button>

        <Button onClick={handleNext} variant="primary" disabled={loading}>
          {loading ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
};
```

**Repeat for all steps**: BasicInfoStep, ProgramsStep, CapacityStep, ReviewStep

---

## 3. Exit Confirmation Modal

**File:** `packages/frontend/app/src/pages/organization-onboarding/components/ExitConfirmationModal.tsx`

```typescript
import { Button, Modal } from '@afk/component';

interface ExitConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onSaveAndExit: () => void;
  onDiscard: () => void;
  progress: number; // 0-100
}

export const ExitConfirmationModal: React.FC<ExitConfirmationModalProps> = ({
  open,
  onClose,
  onSaveAndExit,
  onDiscard,
  progress,
}) => {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-2">You're {progress}% done!</h2>
        <p className="text-gray-600 mb-6">
          Your progress will be saved and you can resume anytime.
        </p>

        <div className="flex gap-3 justify-end">
          <Button onClick={onClose} variant="outline">
            Continue Onboarding
          </Button>
          <Button onClick={onDiscard} variant="ghost" className="text-red-600">
            Discard Progress
          </Button>
          <Button onClick={onSaveAndExit} variant="primary">
            Save & Exit
          </Button>
        </div>
      </div>
    </Modal>
  );
};
```

---

## 4. Banner for Create Proposal Page

**File:** `packages/frontend/app/src/pages/proposals/create-proposal.tsx`

### Add at top of file:

```typescript
import { useOrganizationOnboardingStore } from '@/store/organization-onboarding';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
```

### Add inside component:

```typescript
export const CreateProposal = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useProposalsStore();
  const {
    qualityScore,
    loadQualityScore,
    shouldShowBanner,
    dismissBanner
  } = useOrganizationOnboardingStore();

  const [showBanner, setShowBanner] = useState(false);

  // Load quality score on mount
  useEffect(() => {
    if (currentOrganization?.id) {
      loadQualityScore(currentOrganization.id);
    }
  }, [currentOrganization?.id, loadQualityScore]);

  // Check if we should show banner
  useEffect(() => {
    if (qualityScore) {
      setShowBanner(shouldShowBanner('create_proposal'));
    }
  }, [qualityScore, shouldShowBanner]);

  const handleDismiss = async () => {
    if (currentOrganization?.id) {
      await dismissBanner(currentOrganization.id, 'create_proposal');
      setShowBanner(false);
    }
  };

  const goToOnboarding = () => {
    navigate(`/organization/onboarding?orgId=${currentOrganization?.id}`);
  };

  return (
    <AutoSidebarPadding className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        {/* ... existing header ... */}
      </div>

      {/* NEW: Onboarding Banner */}
      {showBanner && qualityScore && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 mx-6 mt-4 rounded-lg shadow-lg">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                📊 Complete your organization profile for better proposals
              </h3>
              <p className="text-sm text-blue-100 mt-1">
                AI-powered proposal writing works best with a complete profile. Takes 5-10 minutes.
              </p>
              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className="bg-white/20 px-2 py-1 rounded">
                  Current quality: {qualityScore.overall}/100
                </span>
                <span className="text-blue-200">
                  Complete profile → Unlock AI recommendations
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={goToOnboarding}
                className="bg-white text-blue-600 hover:bg-blue-50"
                size="small"
              >
                Complete Profile
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                className="text-white hover:bg-white/10"
                size="small"
              >
                Skip for now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ... rest of component ... */}
    </AutoSidebarPadding>
  );
};
```

---

## 5. Navbar Badge/Link

**File:** `packages/frontend/app/src/components/navbar.tsx` (or wherever nav is)

```typescript
export const Navbar = () => {
  const { qualityScore, progress } = useOrganizationOnboardingStore();
  const { currentOrganization } = useProposalsStore();

  const isIncomplete = progress && !progress.isComplete;
  const needsImprovement = qualityScore && qualityScore.overall < 60;

  return (
    <nav>
      {/* ... other nav items ... */}

      <NavLink to="/organization/onboarding" className="relative">
        Organization Profile
        {(isIncomplete || needsImprovement) && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
        )}
      </NavLink>
    </nav>
  );
};
```

---

## 6. Resume Prompt Component

**File:** `packages/frontend/app/src/pages/organization-onboarding/components/ResumePrompt.tsx`

```typescript
import { Button } from '@afk/component';
import { useOrganizationOnboardingStore } from '@/store/organization-onboarding';

export const ResumePrompt: React.FC<{ organizationId: string }> = ({ organizationId }) => {
  const { progress, qualityScore, resumeOnboarding } = useOrganizationOnboardingStore();

  if (!progress || progress.currentStep === 0) return null;

  const completionPct = Math.round((progress.completedSteps.length / 7) * 100);
  const projectedScore = qualityScore ? Math.min(100, qualityScore.overall + 30) : 75;
  const timeRemaining = Math.max(1, 7 - progress.completedSteps.length) * 1.5; // ~1.5 min per step

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-blue-900 mb-2">
        Welcome back! 👋
      </h3>
      <p className="text-sm text-blue-700 mb-4">
        You're {completionPct}% done with your organization profile.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div className="bg-white rounded p-3">
          <div className="text-gray-600 text-xs">Current Quality</div>
          <div className="text-lg font-bold text-gray-900">{qualityScore?.overall || 0}/100</div>
        </div>
        <div className="bg-white rounded p-3">
          <div className="text-gray-600 text-xs">Projected Quality</div>
          <div className="text-lg font-bold text-green-600">{projectedScore}/100</div>
        </div>
        <div className="bg-white rounded p-3">
          <div className="text-gray-600 text-xs">Time Remaining</div>
          <div className="text-lg font-bold text-gray-900">~{timeRemaining} min</div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={() => resumeOnboarding(organizationId)} variant="primary">
          Resume from Step {progress.currentStep}
        </Button>
        <Button variant="outline">
          Start Over
        </Button>
      </div>
    </div>
  );
};
```

**Then add to OrganizationOnboarding.tsx:**

```typescript
export const OrganizationOnboarding = () => {
  const { progress } = useOrganizationOnboardingStore();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Show resume prompt if there's saved progress */}
      {progress && progress.currentStep > 0 && !progress.isComplete && (
        <ResumePrompt organizationId={organizationId} />
      )}

      {/* ... rest of wizard ... */}
    </div>
  );
};
```

---

## 7. Backend Mutations Needed

**File:** `packages/backend/server/src/modules/onboarding/onboarding.resolver.ts`

```typescript
@Mutation(() => Boolean)
async skipOnboarding(
  @Args('organizationId') organizationId: string,
  @Args('currentStep') currentStep: number,
  @Args('context') context: string,
): Promise<boolean> {
  // Save current step
  await this.onboardingService.updateProgress(organizationId, {
    currentStep,
    status: 'skipped',
  });

  // Track dismissal
  await this.onboardingService.recordDismissal(organizationId, context);

  return true;
}

@Mutation(() => Boolean)
async dismissOnboardingBanner(
  @Args('organizationId') organizationId: string,
  @Args('context') context: string,
): Promise<boolean> {
  await this.onboardingService.recordDismissal(organizationId, context);
  return true;
}
```

---

## 8. Database Migration

**File:** `packages/backend/server/prisma/migrations/XXX_add_onboarding_dismissals.sql`

```sql
-- Create dismissals table
CREATE TABLE "OnboardingDismissal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "context" TEXT NOT NULL,
  "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OnboardingDismissal_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);

-- Add indexes
CREATE INDEX "OnboardingDismissal_organizationId_context_idx"
  ON "OnboardingDismissal"("organizationId", "context");

-- Add status field to OnboardingProgress
ALTER TABLE "OnboardingProgress"
  ADD COLUMN "status" TEXT DEFAULT 'in_progress';
```

---

## Testing Checklist

### Manual Testing

- [ ] Start onboarding → Click "Skip for now" → Verify progress saved
- [ ] Return to onboarding → Verify resume prompt shows
- [ ] Click "Resume" → Verify starts at correct step
- [ ] Complete onboarding → Verify banner doesn't show
- [ ] Create proposal with incomplete profile → Verify banner shows
- [ ] Dismiss banner → Verify it doesn't show for 7 days
- [ ] Dismiss banner 3 times → Verify "Don't show again" option
- [ ] Check Settings → Verify "Organization Profile" link exists
- [ ] Exit mid-step → Verify exit confirmation modal
- [ ] Discard progress → Verify data cleared

### Automated Testing

```typescript
describe('Organization Onboarding UX', () => {
  test('should show banner on create proposal if quality < 60', async () => {
    // Setup: Create org with quality score 45
    // Navigate to /proposals/new
    // Assert: Banner is visible
  });

  test('should not show banner if dismissed recently', async () => {
    // Setup: Dismiss banner
    // Navigate to /proposals/new
    // Assert: Banner is not visible
  });

  test('should save progress when skipping', async () => {
    // Setup: Complete 3 steps
    // Action: Click "Skip for now"
    // Assert: Progress saved in DB with currentStep = 3
  });

  test('should resume from saved step', async () => {
    // Setup: Saved progress at step 4
    // Navigate to /organization/onboarding
    // Assert: Resume prompt shows
    // Action: Click "Resume"
    // Assert: Wizard starts at step 4
  });
});
```

---

## Summary: What You Need to Build

1. **Store enhancements** - Add skip/resume/dismiss methods (1 hour)
2. **Skip buttons on all steps** - 6 components to update (30 min)
3. **Exit confirmation modal** - New component (30 min)
4. **Create proposal banner** - Update create-proposal.tsx (1 hour)
5. **Navbar badge** - Update navbar component (15 min)
6. **Resume prompt** - New component (30 min)
7. **Backend mutations** - Add skip/dismiss endpoints (1 hour)
8. **Database migration** - Add dismissals table (15 min)
9. **Testing** - Manual + automated (2 hours)

**Total time estimate: 7-8 hours**

---

## Next Steps

Would you like me to implement any of these components? I recommend starting with:
1. Skip buttons (quick win, immediate UX improvement)
2. Create proposal banner (highest value, drives adoption)
3. Resume prompt (enables gradual completion)
