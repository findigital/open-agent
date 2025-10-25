# Organization Onboarding - Gaps & Missing Pieces Analysis

## Executive Summary

**Current Implementation Status: ~60% Complete**

The organization onboarding system has a solid foundation with:
- ✅ All frontend UI components built
- ✅ 10 GraphQL mutations implemented
- ✅ Database schema complete
- ✅ AI extraction service functional
- ✅ Skip/resume UX implemented

However, there are **critical gaps** that prevent the system from working in production:

---

## 🔴 CRITICAL ISSUES (Must Fix Immediately)

### 1. Security Vulnerabilities - SEVERE RISK

**File:** `packages/backend/server/src/modules/onboarding/onboarding.resolver.ts`

**Problem:** **NO AUTHENTICATION OR AUTHORIZATION** on any endpoint

```typescript
// Current (UNSAFE):
@Mutation(() => Boolean)
async saveBasicInfo(
  @Args('input') input: BasicInfoInput  // ← Anyone can modify ANY org!
): Promise<boolean> {
  await this.onboardingService.saveBasicInfo(input.organizationId, input);
  return true;
}

// Should be:
@Mutation(() => Boolean)
@UseGuards(JwtAuthGuard, OrganizationMemberGuard)  // ← ADD THIS
async saveBasicInfo(
  @CurrentUser() user: { id: string },  // ← ADD THIS
  @Args('input') input: BasicInfoInput
): Promise<boolean> {
  // Verify user is member of organization
  await this.validateOrgMembership(user.id, input.organizationId);
  await this.onboardingService.saveBasicInfo(input.organizationId, input);
  return true;
}
```

**Impact:**
- **Data breach risk:** Anyone can read/modify any organization's onboarding data
- **Compliance violation:** GDPR, SOC 2 fail without proper access controls
- **Production blocker:** Cannot deploy to production

**Affected Endpoints:**
- All 10 mutations (startOnboarding, saveBasicInfo, saveMission, saveNeeds, addProgram, saveCapacity, completeOnboarding, extractFromDocument, extractFromWebsite, and 3 queries)
- Lines 26-135 in `onboarding.resolver.ts`

---

### 2. Missing Backend Mutation - Runtime Error

**Frontend calls non-existent mutation:**

```typescript
// File: packages/frontend/app/src/store/organization-onboarding.ts:351-359
await gql({
  query: `
    mutation UpdateOnboardingProgress($organizationId: ID!, $currentStep: Int!) {
      updateOnboardingProgress(organizationId: $organizationId, currentStep: $currentStep) {
        id
        currentStep
      }
    }
  `,
  variables: { organizationId, currentStep },
});
```

**This mutation DOES NOT EXIST in the backend!**

**Impact:**
- When user clicks "Skip for now" → GraphQL error
- Progress is NOT saved
- User loses work
- Console shows error but no user notification

**Fix Required:**
Add to `onboarding.resolver.ts`:
```typescript
@Mutation(() => OnboardingProgressOutput)
@UseGuards(JwtAuthGuard, OrganizationMemberGuard)
async updateOnboardingProgress(
  @CurrentUser() user: { id: string },
  @Args('organizationId') organizationId: string,
  @Args('currentStep') currentStep: number,
): Promise<OnboardingProgressOutput> {
  return this.onboardingService.skipStep(organizationId, currentStep);
}
```

---

### 3. Document Upload Corrupts Binary Files

**File:** `packages/frontend/app/src/pages/organization-onboarding/components/DocumentUpload.tsx:104-109`

**Problem:** Reading PDF/DOCX as text instead of binary

```typescript
// Current (BROKEN):
if (file.type === 'text/plain') {
  reader.readAsText(file);
} else {
  reader.readAsText(file);  // ← This corrupts PDF/DOCX!
}
```

**Impact:**
- PDF/DOCX files are corrupted when uploaded
- AI extraction receives garbage data
- Feature completely non-functional for binary files
- Only works for .txt files

**Fix Required:**
```typescript
if (file.type === 'text/plain') {
  reader.readAsText(file);
} else {
  // Handle binary files properly
  reader.readAsDataURL(file);  // or readAsArrayBuffer + base64 encode
  // Then send base64 to backend for parsing
}
```

**Additional Backend Work Needed:**
- Backend must parse PDF using `pdf-parse` or similar
- Backend must parse DOCX using `mammoth` or similar
- Add file upload endpoint (multipart/form-data)

---

### 4. No Organization Selection UI

**File:** `packages/frontend/app/src/pages/organization-onboarding/OrganizationOnboarding.tsx:32`

**Problem:** organizationId comes from URL query param with NO UI to select

```typescript
const organizationId = searchParams.get('organizationId');

if (!organizationId) {
  return <div>No organization selected</div>;  // ← User is stuck
}
```

**Impact:**
- Users cannot start onboarding (no way to select org)
- Must manually construct URL: `/organization/onboarding?organizationId=abc123`
- No entry point from dashboard/proposals
- Feature is hidden/unreachable

**Missing Pieces:**
1. Organization selector dropdown
2. Navigation from dashboard to onboarding
3. "Start Onboarding" button on organization page
4. Breadcrumb showing current org

**Fix Required:**
Create organization selector component:
```typescript
const OrganizationSelector = () => {
  const [orgs, setOrgs] = useState([]);

  useEffect(() => {
    // Query user's organizations
    const res = await gql({ query: `
      query GetMyOrganizations {
        myOrganizations {
          id
          name
        }
      }
    `});
    setOrgs(res.data.myOrganizations);
  }, []);

  return (
    <select onChange={(e) => navigate(`/organization/onboarding?organizationId=${e.target.value}`)}>
      {orgs.map(org => <option value={org.id}>{org.name}</option>)}
    </select>
  );
};
```

---

## 🟠 HIGH PRIORITY (Breaks Core Functionality)

### 5. No Data Loading on Mount - Cannot Edit Existing Data

**Problem:** Every step component starts with empty forms

**Example:** `BasicInfoStep.tsx:14-24`
```typescript
const [formData, setFormData] = useState({
  name: '',  // ← Always empty!
  taxId: '',
  // ... etc
});

// MISSING: useEffect to load existing data
```

**Impact:**
- Cannot edit existing organization information
- Must re-enter all data every time
- Each save creates duplicates or overwrites
- User experience is broken for existing organizations

**Fix Required:**
Add to each step component:
```typescript
useEffect(() => {
  const loadExistingData = async () => {
    const res = await gql({
      query: `
        query GetOrganizationContext($orgId: ID!) {
          getOrganizationContext(orgId: $orgId) {
            name
            taxId
            mission
            // ... all fields
          }
        }
      `,
      variables: { orgId: organizationId }
    });

    if (res.data.getOrganizationContext) {
      setFormData(res.data.getOrganizationContext);
    }
  };
  loadExistingData();
}, [organizationId]);
```

**Backend Work Needed:**
Add query to `onboarding.resolver.ts`:
```typescript
@Query(() => OrganizationContextOutput)
async getOrganizationContext(
  @Args('organizationId') organizationId: string
): Promise<OrganizationContextOutput> {
  return this.onboardingService.getOrganizationContext(organizationId);
}
```

---

### 6. Missing Error Handling Throughout

**Locations Without Try/Catch:**

1. **Resolver Methods** (all 13 endpoints)
   - No error handling
   - Service errors propagate as generic GraphQL errors
   - User sees unhelpful "Internal server error"

2. **Frontend Store**
   - `skipOnboarding()` line 341-360: No error catch for failed mutation
   - Will hang/crash on error

**Impact:**
- Poor user experience (unclear errors)
- Debugging nightmare (no logs)
- Silent failures (user thinks data saved when it didn't)

**Fix Required:**
Add to all resolver methods:
```typescript
@Mutation(() => Boolean)
async saveBasicInfo(...): Promise<boolean> {
  try {
    await this.onboardingService.saveBasicInfo(...);
    return true;
  } catch (error) {
    this.logger.error(`Failed to save basic info: ${error.message}`, error.stack);
    throw new BadRequestException(`Failed to save basic info: ${error.message}`);
  }
}
```

---

### 7. Banner Dismissal Not Persisted

**File:** `packages/frontend/app/src/store/organization-onboarding.ts:368-384`

**Problem:** Dismissals stored in localStorage, not backend

```typescript
dismissBanner: async (organizationId: string, context: string) => {
  // ...
  // Store dismissal in localStorage for persistence
  localStorage.setItem(dismissalKey, JSON.stringify({
    count: dismissalCount + 1,
    lastDismissedAt: new Date().toISOString(),
  }));
}
```

**Impact:**
- Dismissals lost on different device
- Dismissals lost if user clears browser data
- Cannot track dismissal analytics server-side
- Counts reset across sessions

**Fix Required:**
Add backend mutation:
```typescript
@Mutation(() => Boolean)
async dismissOnboardingBanner(
  @CurrentUser() user: { id: string },
  @Args('organizationId') organizationId: string,
  @Args('context') context: string,
): Promise<boolean> {
  await this.onboardingService.recordDismissal(user.id, organizationId, context);
  return true;
}
```

Add database table:
```prisma
model OnboardingDismissal {
  id              String   @id @default(cuid())
  organizationId  String
  userId          String
  context         String
  dismissedAt     DateTime @default(now())

  @@index([organizationId, userId, context])
}
```

---

## 🟡 MEDIUM PRIORITY (UX & Polish)

### 8. Extracted Data Auto-Saved Without Preview

**File:** `packages/backend/server/src/modules/onboarding/onboarding-agent.service.ts:108`

**Problem:** AI extraction immediately saves to database

```typescript
// Extract and auto-save
const extracted = this.parseExtractionResponse(textContent);
await this.autoSaveExtractedData(organizationId, extracted);  // ← No confirmation
return extracted;
```

**Impact:**
- Incorrect AI extractions permanently saved
- No way to review before accepting
- Cannot reject bad extractions

**Fix:** Add preview step in frontend:
```typescript
// After extraction
const extracted = await extractFromWebsite(...);

// Show preview modal
<Modal>
  <h3>Review Extracted Data</h3>
  <pre>{JSON.stringify(extracted, null, 2)}</pre>
  <Button onClick={acceptAndSave}>Accept</Button>
  <Button onClick={discard}>Discard</Button>
</Modal>
```

---

### 9. Hardcoded API Key Fallback

**File:** `packages/backend/server/src/modules/onboarding/onboarding-agent.service.ts:63`

```typescript
apiKey: anthropicKey || 'placeholder',  // ← Will fail silently
```

**Impact:**
- If ANTHROPIC_API_KEY not set, extraction fails with cryptic error
- Developer thinks code is broken
- Wasted debugging time

**Fix:**
```typescript
if (!anthropicKey) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required for AI extraction');
}
this.anthropic = new Anthropic({ apiKey: anthropicKey });
```

---

### 10. Unused Database Features

**Schema has features not used:**

1. **OnboardingDocument table** - Defined but never populated
   - Could track all uploaded documents
   - Could store extracted data separately
   - Could show document history

2. **WebsiteImportJob table** - Defined but not used
   - Could track website import jobs
   - Could show import history
   - Could retry failed imports

**Recommendation:** Either use these tables or remove them

---

## 📊 IMPLEMENTATION PRIORITY MATRIX

### Phase 1: Critical Fixes (REQUIRED FOR MVP)
**Estimated Time: 4-6 hours**

| Priority | Task | Time | Risk |
|----------|------|------|------|
| 1 | Add authentication guards to all resolver methods | 1.5h | HIGH |
| 2 | Add `updateOnboardingProgress` mutation | 30m | HIGH |
| 3 | Fix document upload binary handling | 1h | HIGH |
| 4 | Add organization selection UI | 1h | HIGH |
| 5 | Add data loading to step components | 1.5h | HIGH |
| 6 | Add error handling to resolvers | 30m | MEDIUM |

### Phase 2: Core Functionality (Required for Production)
**Estimated Time: 4-5 hours**

| Priority | Task | Time | Risk |
|----------|------|------|------|
| 7 | Add `getOrganizationContext` query | 1h | MEDIUM |
| 8 | Implement dismissal banner backend | 1h | LOW |
| 9 | Add try/catch to all service methods | 1h | MEDIUM |
| 10 | Add PDF/DOCX parsing to backend | 2h | MEDIUM |

### Phase 3: Polish & Optimization (Nice to Have)
**Estimated Time: 3-4 hours**

| Priority | Task | Time | Risk |
|----------|------|------|------|
| 11 | Add extraction data preview | 1h | LOW |
| 12 | Remove hardcoded fallback values | 30m | LOW |
| 13 | Add audit logging | 1h | LOW |
| 14 | Use OnboardingDocument table | 1.5h | LOW |

---

## 🛠️ IMPLEMENTATION CHECKLIST

### Backend Tasks

**Security:**
- [ ] Add `@UseGuards(JwtAuthGuard, OrganizationMemberGuard)` to all 13 endpoints
- [ ] Add `@CurrentUser()` parameter to all mutations
- [ ] Create `OrganizationMemberGuard` if doesn't exist
- [ ] Add organization membership validation logic

**Missing Mutations:**
- [ ] Add `updateOnboardingProgress` mutation
- [ ] Add `getOrganizationContext` query
- [ ] Add `dismissOnboardingBanner` mutation

**File Handling:**
- [ ] Install `pdf-parse` package
- [ ] Install `mammoth` package
- [ ] Create file upload endpoint (multipart/form-data)
- [ ] Add PDF parsing logic
- [ ] Add DOCX parsing logic

**Error Handling:**
- [ ] Wrap all resolver methods in try/catch
- [ ] Add custom exception classes
- [ ] Add logging with Winston/Bunyan
- [ ] Return user-friendly error messages

**Database:**
- [ ] Create `OnboardingDismissal` table migration
- [ ] Add indexes for performance
- [ ] Implement `recordDismissal` service method
- [ ] Implement `getDismissals` service method

### Frontend Tasks

**Organization Context:**
- [ ] Create organization selector component
- [ ] Add "Start Onboarding" button to dashboard
- [ ] Add navigation from proposals to onboarding
- [ ] Add breadcrumb showing current org
- [ ] Add org switcher in onboarding header

**Data Loading:**
- [ ] Add `useEffect` to BasicInfoStep to load existing data
- [ ] Add `useEffect` to MissionNeedsStep to load existing data
- [ ] Add `useEffect` to ProgramsStep to load programs
- [ ] Add `useEffect` to CapacityStep to load capacity
- [ ] Add loading states while fetching

**Document Upload:**
- [ ] Fix binary file reading (use `readAsArrayBuffer`)
- [ ] Add base64 encoding for binary files
- [ ] Update backend call to send base64
- [ ] Add file size validation
- [ ] Add file type validation
- [ ] Add upload progress indicator

**Store:**
- [ ] Remove TODO comment (line 346)
- [ ] Implement `skipOnboarding` with correct mutation
- [ ] Add error handling to all store methods
- [ ] Add retry logic for failed API calls
- [ ] Implement dismissal backend persistence

**Error Handling:**
- [ ] Add error boundaries to step components
- [ ] Add toast notifications for all errors
- [ ] Add retry buttons for failed operations
- [ ] Add fallback UI for errors

---

## 📈 TESTING REQUIREMENTS

### Must Test Before Production:

1. **Security Testing:**
   - [ ] Verify unauthenticated users cannot access endpoints
   - [ ] Verify users cannot access other organizations' data
   - [ ] Test cross-organization access attempts
   - [ ] Test SQL injection in inputs

2. **Functionality Testing:**
   - [ ] Test complete onboarding flow end-to-end
   - [ ] Test skip/resume functionality
   - [ ] Test website extraction
   - [ ] Test document upload (PDF, DOCX, TXT)
   - [ ] Test data persistence across sessions
   - [ ] Test quality score calculation
   - [ ] Test recommendations generation

3. **Error Handling Testing:**
   - [ ] Test with invalid organizationId
   - [ ] Test with missing required fields
   - [ ] Test with API keys not set
   - [ ] Test with network errors
   - [ ] Test with file upload errors

4. **UX Testing:**
   - [ ] Test organization selection flow
   - [ ] Test data loading/pre-population
   - [ ] Test banner dismissal
   - [ ] Test resume prompt
   - [ ] Test progress tracking

---

## 🚦 DEPLOYMENT READINESS

**Current Status: NOT READY FOR PRODUCTION**

**Blockers:**
- ❌ No authentication/authorization (CRITICAL SECURITY RISK)
- ❌ Missing backend mutation causes runtime errors
- ❌ Document upload broken for binary files
- ❌ No organization selection (feature unreachable)
- ❌ No data loading (cannot edit existing data)

**After Phase 1 Fixes:**
- ⚠️ READY FOR INTERNAL TESTING (not production)

**After Phase 2 Fixes:**
- ✅ READY FOR PRODUCTION (with monitoring)

---

## 💡 RECOMMENDATIONS

### Immediate Actions (Next 2 Hours):

1. **Fix Authentication** - Add guards to prevent data breaches
2. **Add Missing Mutation** - Fix skip functionality
3. **Create Hotfix Branch** - Isolate critical fixes

### This Week:

1. Complete Phase 1 (Critical Fixes)
2. Add integration tests
3. Deploy to staging environment
4. Conduct security review

### Next Sprint:

1. Complete Phase 2 (Core Functionality)
2. Add monitoring/analytics
3. Conduct user acceptance testing
4. Plan Phase 3 (Polish)

---

## 📞 QUESTIONS TO RESOLVE

1. **Organization Membership Model** - How is membership tracked?
   - Is there an `OrganizationMember` table?
   - What roles exist (admin, member, viewer)?
   - Who can modify onboarding data?

2. **File Storage** - Where should uploaded documents be stored?
   - S3/Cloud storage?
   - Local filesystem?
   - Database as binary?

3. **Multi-Org Support** - Can users belong to multiple organizations?
   - How to handle switching orgs?
   - Default org selection logic?

4. **Permissions** - Who can complete onboarding?
   - Only admins?
   - Any organization member?
   - Create restrictions?

---

## 📚 RELATED DOCUMENTATION

- **UX Design:** `ONBOARDING_UX_DESIGN.md`
- **Implementation Guide:** `ONBOARDING_IMPLEMENTATION_GUIDE.md`
- **API Documentation:** (TO BE CREATED)
- **Testing Guide:** (TO BE CREATED)

---

**Last Updated:** 2025-10-25
**Status:** ~60% Complete (Critical gaps identified)
**Next Review:** After Phase 1 implementation
