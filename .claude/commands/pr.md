# Create Pull Request

Create a pull request for the current branch.

## Steps
1. Check current branch name
2. Run `git log main..HEAD` to see commits to include
3. Run `git diff main...HEAD --stat` to see changed files
4. Generate PR title and description based on commits
5. Create PR using `gh pr create`

## PR Format
```
## Summary
<bullet points of changes>

## Test plan
<how to test the changes>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
