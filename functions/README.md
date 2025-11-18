# Firebase Cloud Functions - MyGuide Health

This directory contains Firebase Cloud Functions for the MyGuide Health application.

## Functions

### `onMedicationAdded`

Sends FCM push notifications to all group members when a new medication is added.

**Trigger**: Firestore `onCreate` in `medications` collection

**Flow**:
1. Triggered when a document is created in `medications/{medicationId}`
2. Gets the medication data including `groupId` and `elderId`
3. Fetches all member IDs from the group document
4. Collects FCM tokens from all group members' user profiles
5. Sends push notification to all tokens with medication details
6. Handles errors for invalid/expired tokens and removes them from user profiles

**Notification Payload**:
- **Title**: "💊 New Medication Added"
- **Body**: "{medication name} has been added for {elder name}"
- **Data**: medication ID, name, groupId, elderId, URL
- **Action**: Opens `/dashboard/medications` when clicked

## Setup

### Install Dependencies

```bash
cd functions
npm install
```

### Build TypeScript

```bash
npm run build
```

### Local Development

Run functions locally with Firebase Emulators:

```bash
npm run serve
```

### Deploy to Firebase

Deploy all functions:

```bash
npm run deploy
```

Deploy specific function:

```bash
firebase deploy --only functions:onMedicationAdded
```

## Dependencies

- **firebase-admin**: ^12.0.0 - Firebase Admin SDK for server-side operations
- **firebase-functions**: ^5.0.0 - Cloud Functions SDK
- **TypeScript**: ^5.0.0 - Type safety

## Structure

```
functions/
├── src/
│   └── index.ts          # Main Cloud Functions code
├── lib/                  # Compiled JavaScript (gitignored)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── .gitignore           # Ignore node_modules and compiled files
```

## Environment

- **Node.js Version**: 18
- **Runtime**: Node.js 18 (specified in package.json engines)

## Error Handling

The function includes comprehensive error handling:

- **Invalid Tokens**: Automatically removes invalid/expired FCM tokens from user profiles
- **Missing Data**: Logs errors for missing group or user data
- **Network Failures**: Tracks success/failure counts for each notification batch

## Monitoring

View function logs:

```bash
npm run logs
```

Or in Firebase Console:
- Go to Firebase Console → Functions → Logs
- Filter by function name: `onMedicationAdded`

## Testing

To test the function:

1. Start Firebase Emulators:
   ```bash
   npm run serve
   ```

2. Add a medication via the web app or Firestore console

3. Check the emulator logs for notification activity

## Production Deployment

Before deploying to production:

1. Ensure Firebase project is set correctly:
   ```bash
   firebase use <project-id>
   ```

2. Build and deploy:
   ```bash
   npm run deploy
   ```

3. Monitor the deployment in Firebase Console

## Notes

- FCM tokens are stored in the `fcmTokens` array field in user documents
- Invalid tokens are automatically cleaned up to prevent future failures
- The function uses multicast messaging for efficient batch sends
- All operations are logged for debugging and monitoring
