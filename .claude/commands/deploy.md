# Deploy to Production

Build the project, commit changes, and push to deploy.

## Steps
1. Run `npm run build` to verify the build passes
2. If build succeeds, show git status and ask user for commit message
3. Commit changes with the provided message
4. Push to origin/main to trigger Vercel deployment
5. Show deployment status link

## Notes
- Only deploy if build passes
- Always show what files will be committed before committing
