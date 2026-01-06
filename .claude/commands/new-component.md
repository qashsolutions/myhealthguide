# Create New Component

Create a new React component following project conventions.

## Arguments
$ARGUMENTS - Component name and location (e.g., "Button in components/ui" or "ElderCard in components/dashboard")

## Steps
1. Parse the component name and location from arguments
2. Create the component file with:
   - 'use client' directive if needed
   - Proper TypeScript interface for props
   - Export the component
3. Follow existing patterns in the codebase

## Template
```tsx
'use client';

import { ... } from '...';

interface ComponentNameProps {
  // props
}

export function ComponentName({ ...props }: ComponentNameProps) {
  return (
    <div>
      {/* component content */}
    </div>
  );
}
```
