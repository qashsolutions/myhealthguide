# Fix TypeScript Errors

Find and fix TypeScript errors in the codebase.

## Steps
1. Run `npx tsc --noEmit` to find all TypeScript errors
2. List all errors grouped by file
3. For each error, read the file and fix the issue
4. Re-run type check to verify fixes

## Common Fixes
- Missing types: Add proper type annotations
- Null/undefined: Add null checks or optional chaining
- Property doesn't exist: Check interface definitions
- Type mismatch: Cast or convert types appropriately
