# Check Deployment Status

Check the status of the latest GitHub Actions run and Vercel deployment.

## Steps
1. Run `gh run list --limit 1` to get the latest run
2. Run `gh run view <run_id>` to show detailed status of all jobs
3. Report which checks passed/failed/are running
4. Provide link to view the run on GitHub

## Output Format
Show a table with:
| Check | Status |
|-------|--------|
| ESLint | ✅/❌/🔄 |
| TypeScript | ✅/❌/🔄 |
| etc. |
