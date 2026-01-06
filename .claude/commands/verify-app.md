# Verify App Deployment

Verify that code changes are deployed and working correctly.

## Workflow

### Step 1: Confirm GitHub Push
```bash
git log -1 --oneline
git status
```
- Verify latest commit is pushed to origin/main
- If not pushed, ask user to push first

### Step 2: Check Deployment Status
```bash
gh run list --limit 1
gh run view <run_id>
```
- Wait for GitHub Actions to complete
- Report status of each check (ESLint, TypeScript, Tests)

### Step 3: Verify Vercel Deployment
- Production URL: https://myguide.health
- Preview URL: https://myhealthguide.vercel.app
- Check that deployment is live with latest changes

### Step 4: UI Testing with Chrome Extension
Instruct user to test with Claude Chrome extension:
1. Navigate to affected pages
2. Verify UI changes are visible
3. Test interactive elements
4. Check console for errors

### Step 5: Report Results
Format results as:
```
## Deployment Verification Report

### Git Status
- Commit: <hash> - <message>
- Pushed: ✅/❌

### GitHub Actions
| Check | Status |
|-------|--------|
| ESLint | ✅/❌ |
| TypeScript | ✅/❌ |
| E2E Tests | ✅/❌ |
| ... | ... |

### UI Verification
- [ ] Page 1: PASS/FAIL - <notes>
- [ ] Page 2: PASS/FAIL - <notes>

### Issues Found
1. Issue description
   - Suggested fix: ...

### Next Steps
- [ ] Action items
```

### Step 6: Fix Loop
If issues found:
1. Identify the root cause
2. Suggest specific code fixes
3. Implement fixes
4. Re-run verification

Continue loop until all tests pass.

## Quick Commands
- Check deploy status: `gh run list --limit 1`
- View run details: `gh run view <id>`
- Check git status: `git log origin/main..HEAD`
