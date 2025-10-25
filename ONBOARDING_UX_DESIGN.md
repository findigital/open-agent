# Organization Onboarding UX Design

## Design Principles

### Never Force, Always Invite
- Users can always skip or dismiss onboarding
- Clear value proposition: "Complete profile → Better proposals"
- Multiple entry points to resume

### Progressive Disclosure
- Don't show everything at once
- Start with minimum viable data
- Allow refinement over time

### Context-Aware Triggers
- Show when most relevant (e.g., before creating first proposal)
- Respect user dismissals (don't nag)
- Smart timing based on user journey

---

## When to Show Organization Onboarding

### Trigger 1: First Proposal Creation ⭐ PRIMARY
**When:** User clicks "Create New Proposal"
**If:** Organization profile is incomplete or quality score < 60
**Show:** Banner at top of create-proposal page

```tsx
{!orgProfileComplete && (
  <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 mb-4 rounded-lg">
    <div className="flex items-start gap-4">
      <div className="flex-1">
        <h3 className="font-semibold text-lg">📊 Build your organization profile first</h3>
        <p className="text-sm text-blue-100 mt-1">
          Complete your profile to unlock AI-powered proposal writing. Takes 5-10 minutes.
        </p>
        <p className="text-xs text-blue-200 mt-2">
          Current quality score: {qualityScore}/100 • {recommendations.length} improvements suggested
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={goToOnboarding} variant="white">
          Complete Profile
        </Button>
        <Button onClick={dismissBanner} variant="ghost">
          Skip for now
        </Button>
      </div>
    </div>
  </div>
)}
```

### Trigger 2: Post-Signup Prompt
**When:** User completes app onboarding (signs up)
**Show:** Optional modal

```tsx
<Modal>
  <h2>One more step to get started</h2>
  <p>Complete your organization profile to write better grant proposals</p>
  <ul>
    ✓ AI learns your mission and programs
    ✓ Auto-populate proposal sections
    ✓ Get quality recommendations
  </ul>
  <Button primary>Complete Profile (5 min)</Button>
  <Button text>I'll do this later</Button>
</Modal>
```

### Trigger 3: Navbar Prompt
**When:** Always visible if incomplete
**Show:** Small indicator badge

```tsx
<NavLink to="/organization/onboarding">
  Organization {incompleteBadge && <Badge color="orange">Incomplete</Badge>}
</NavLink>
```

### Trigger 4: Settings Link
**When:** User wants to update profile
**Show:** Clear entry point

```tsx
<SettingsSection>
  <h3>Organization Profile</h3>
  <p>Quality Score: {score}/100</p>
  <Button>Edit Profile</Button>
</SettingsSection>
```

### Trigger 5: Low Quality Score Alert (Gentle Nudge)
**When:** Quality score < 40 after 7 days
**Show:** One-time dismissible notification

```tsx
{daysSinceSignup > 7 && qualityScore < 40 && !dismissed && (
  <Toast>
    Your organization profile is incomplete. Complete it to improve proposal quality.
    <Button size="sm">Complete Now</Button>
  </Toast>
)}
```

---

## Skip & Resume Functionality

### States to Track

```typescript
interface OnboardingState {
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  lastDismissedAt?: Date;
  dismissalCount: number; // Stop showing after 3 dismissals
  currentStep: number;
  completedSteps: number[];
  qualityScore: number;
}
```

### User Actions

#### 1. "Skip for now" Button
- Available on every step
- Saves current progress
- Can resume later from same step
- Show gentle reminder after 7 days (if not dismissed 3+ times)

#### 2. "Complete later" Button
- Explicitly saves partial progress
- Shows "Resume" button in navbar
- No reminders (user has explicitly deferred)

#### 3. Exit (X button)
- Auto-saves current step
- Treated as implicit "skip for now"

#### 4. "Dismiss permanently" Option
- After 3 skips, offer "Don't show again"
- Can still access via Settings → Organization Profile

---

## UX Patterns

### Pattern 1: Inline Banner (Preferred)
**Where:** Create proposal page
**Dismissible:** Yes
**Persistent:** Show again after 3 proposal creations if still incomplete

```tsx
<InlineBanner severity="info" dismissible onDismiss={handleDismiss}>
  <strong>Improve proposal quality:</strong> Complete your organization profile
  <Button size="small">Complete Profile</Button>
</InlineBanner>
```

### Pattern 2: Progress Indicator
**Where:** In onboarding wizard itself
**Shows:**
- Steps completed (3/7)
- Quality score change (+15 points if you complete this)
- Estimated time remaining (2 minutes left)

### Pattern 3: Exit Confirmation
**When:** User tries to exit mid-flow
**Message:**

```
You're 60% done! Your progress will be saved.

[Continue] [Save & Exit] [Discard Progress]
```

### Pattern 4: Resume Prompt
**When:** User returns after partial completion
**Message:**

```
Welcome back! You're 60% done with your organization profile.

Quality Score: 45/100 → 75/100 (projected)
Time remaining: ~3 minutes

[Resume from Step 4] [Start Over]
```

---

## State Management

### Database Schema Addition

```prisma
model OnboardingDismissal {
  id              String   @id @default(cuid())
  organizationId  String
  userId          String
  context         String   // 'create_proposal', 'navbar', 'post_signup'
  dismissedAt     DateTime @default(now())

  @@index([organizationId, userId, context])
}
```

### Frontend Store Enhancement

```typescript
interface OnboardingFlowState extends OrganizationOnboardingState {
  // Add these fields
  hasDismissed: (context: string) => boolean;
  dismissUntil: (context: string, until: Date) => void;
  permanentlyDismiss: (context: string) => void;
  shouldShowBanner: (context: string) => boolean;
  resumeOnboarding: () => void;
}
```

---

## Implementation Checklist

### Phase 1: Core Skip/Resume (2-3 hours)
- [ ] Add skip/exit buttons to all steps
- [ ] Save progress on skip/exit
- [ ] Load progress on return
- [ ] Add "Resume" entry point in navbar
- [ ] Add exit confirmation modal

### Phase 2: Contextual Triggers (2-3 hours)
- [ ] Add banner to create-proposal page
- [ ] Check quality score before showing banner
- [ ] Add dismissal tracking to database
- [ ] Respect dismissals (don't nag)
- [ ] Add Settings → Organization Profile link

### Phase 3: Smart Prompts (1-2 hours)
- [ ] Post-signup modal (optional)
- [ ] Navbar badge for incomplete profiles
- [ ] Low-quality gentle reminder (one-time)
- [ ] "3 skip" permanent dismiss option

### Phase 4: Polish (1 hour)
- [ ] Progress indicators ("3/7 steps")
- [ ] Time estimates ("2 min left")
- [ ] Quality score projections ("+30 points")
- [ ] Resume confirmation ("Welcome back!")

---

## Example User Flows

### Flow A: Eager User
1. Signs up → sees post-signup modal
2. Clicks "Complete Profile"
3. Completes all 7 steps
4. Creates first proposal with 85/100 quality score ✅

### Flow B: Busy User
1. Signs up → clicks "I'll do this later"
2. Tries to create proposal → sees banner
3. Clicks "Skip for now" (saves progress)
4. Later: Clicks navbar "Resume Profile" → completes
5. Creates better proposals ✅

### Flow C: Reluctant User
1. Signs up → dismisses modal
2. Creates proposal → dismisses banner (1st time)
3. Creates proposal → dismisses banner (2nd time)
4. Creates proposal → dismisses banner (3rd time)
5. Sees "Don't show again" option → clicks it
6. Can still access via Settings if needed ✅

### Flow D: Gradual User
1. Completes steps 1-3 → exits
2. Returns next day → sees "Resume from step 4"
3. Completes steps 4-5 → exits
4. Returns next week → completes remaining steps
5. Quality score improves gradually ✅

---

## Success Metrics

Track these to measure effectiveness:

1. **Completion Rate**: % users who complete onboarding
2. **Time to Complete**: Average time from start to finish
3. **Dismissal Rate**: % users who skip (by context)
4. **Resume Rate**: % users who resume after skipping
5. **Quality Score Impact**: Avg quality score with vs without profile
6. **Proposal Quality**: Correlation between profile quality and proposal success

---

## Accessibility & Mobile

- All modals/banners keyboard-navigable
- Screen reader announcements for progress
- Mobile: Stack buttons vertically
- Touch-friendly hit areas (44px minimum)
- High contrast mode support

---

## Anti-Patterns to Avoid

❌ **Don't:** Block users from creating proposals
✅ **Do:** Allow creation with warning about quality

❌ **Don't:** Force full completion in one session
✅ **Do:** Save progress, allow gradual completion

❌ **Don't:** Nag users repeatedly after dismissal
✅ **Do:** Respect dismissals, show subtle reminders

❌ **Don't:** Hide the onboarding entry point
✅ **Do:** Always show in Settings/Profile menu

❌ **Don't:** Use guilt/shame ("Your profile is terrible!")
✅ **Do:** Use positive framing ("Unlock better proposals!")

---

## References

Inspired by best practices from:
- Notion's workspace setup
- Stripe's onboarding flow
- Linear's project setup
- Airtable's base creation
- Slack's workspace configuration
