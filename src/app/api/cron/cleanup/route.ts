import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

/**
 * GET /api/cron/cleanup
 * Cleanup job for expired email verification tokens
 * Should be called by a cron job (e.g., Vercel Cron)
 */

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'development-cron-secret';
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date();
    let deletedTokens = 0;
    let deletedUsers = 0;
    
    // 1. Clean up expired email verification tokens
    const expiredTokens = await adminDb
      .collection('emailVerifications')
      .where('expires', '<', now)
      .where('used', '==', false)
      .get();
    
    const tokenBatch = adminDb.batch();
    expiredTokens.forEach(doc => {
      tokenBatch.delete(doc.ref);
      deletedTokens++;
    });
    
    if (deletedTokens > 0) {
      await tokenBatch.commit();
    }
    
    // 2. Clean up used tokens older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oldUsedTokens = await adminDb
      .collection('emailVerifications')
      .where('used', '==', true)
      .where('usedAt', '<', thirtyDaysAgo)
      .get();
    
    const oldTokenBatch = adminDb.batch();
    oldUsedTokens.forEach(doc => {
      oldTokenBatch.delete(doc.ref);
      deletedTokens++;
    });
    
    if (oldUsedTokens.size > 0) {
      await oldTokenBatch.commit();
    }
    
    // 3. Optional: Clean up unverified users older than 7 days
    // This is commented out by default as it's quite aggressive
    // Uncomment if you want to auto-delete unverified accounts
    /*
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const unverifiedUsers = await adminAuth.listUsers();
    const deletionPromises = unverifiedUsers.users
      .filter(user => {
        const creationTime = new Date(user.metadata.creationTime);
        return !user.emailVerified && creationTime < sevenDaysAgo;
      })
      .map(async user => {
        await adminAuth.deleteUser(user.uid);
        await adminDb.collection('users').doc(user.uid).delete();
        deletedUsers++;
      });
    
    await Promise.all(deletionPromises);
    */
    
    console.log(`[Cleanup] Deleted ${deletedTokens} tokens and ${deletedUsers} users`);
    
    return NextResponse.json({
      success: true,
      cleaned: {
        tokens: deletedTokens,
        users: deletedUsers,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Cleanup job error:', error);
    return NextResponse.json(
      { success: false, error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}