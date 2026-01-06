# Build Project

Run the Next.js production build to check for errors.

## Steps
1. Run `npm run build`
2. Report any TypeScript or build errors
3. Show build output summary (page sizes, static vs dynamic routes)

## Common Issues
- TypeScript errors: Fix type issues before deploying
- ESLint warnings: Usually non-blocking but should be addressed
- Dynamic server usage: API routes using request.url need `export const dynamic = 'force-dynamic'`
