# Commit Changes

Stage and commit changes with a conventional commit message.

## Steps
1. Run `git status` to see changed files
2. Run `git diff` to see the changes
3. Generate a commit message following conventional commits:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `refactor:` for code refactoring
   - `docs:` for documentation
   - `style:` for formatting changes
   - `test:` for adding tests
   - `chore:` for maintenance tasks
4. Stage relevant files
5. Commit with the generated message

## Commit Message Format
```
<type>: <short description>

<optional longer description>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```
