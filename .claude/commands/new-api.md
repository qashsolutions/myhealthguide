# Create New API Route

Create a new Next.js API route following project conventions.

## Arguments
$ARGUMENTS - API route path (e.g., "users/profile" creates /api/users/profile)

## Steps
1. Parse the route path from arguments
2. Create the route.ts file at src/app/api/<path>/route.ts
3. Include:
   - `export const dynamic = 'force-dynamic'` for dynamic routes
   - Authentication verification using `verifyAuthToken`
   - Proper error handling
   - TypeScript types for request/response

## Template
```typescript
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/api/verifyAuth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Implementation here

    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('[API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```
