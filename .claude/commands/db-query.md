# Firestore Query Helper

Help write Firestore queries following project patterns.

## Arguments
$ARGUMENTS - Description of what data to query (e.g., "get all elders for a group" or "find medications expiring soon")

## Steps
1. Understand the query requirements
2. Identify the collection(s) involved
3. Write the query using the project's Firebase patterns
4. Include proper TypeScript types

## Common Patterns

### Client-side query:
```typescript
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const q = query(
  collection(db, 'collectionName'),
  where('field', '==', value)
);
const snapshot = await getDocs(q);
```

### Server-side query (API routes):
```typescript
import { getAdminDb } from '@/lib/firebase/admin';

const adminDb = getAdminDb();
const snapshot = await adminDb
  .collection('collectionName')
  .where('field', '==', value)
  .get();
```

## Important Notes
- Always filter out archived items: `where('archived', '==', false)`
- Use proper timestamp handling (see CLAUDE.md section on Firestore timestamps)
- Avoid composite index requirements when possible
