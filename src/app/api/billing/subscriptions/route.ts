import { NextRequest, NextResponse } from 'next/server';
import { ElderBillingService } from '@/lib/stripe/elderBilling';
import { verifyAuthToken, canAccessAgencyServer } from '@/lib/api/verifyAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Verify Firebase ID token
    const authResult = await verifyAuthToken(req);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get agencyId from query params
    const agencyId = req.nextUrl.searchParams.get('agencyId');
    if (!agencyId) {
      return NextResponse.json({ error: 'Agency ID required' }, { status: 400 });
    }

    // Verify user has access to this agency's billing data
    const accessResult = await canAccessAgencyServer(authResult.userId, agencyId);
    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: 'Access denied. Only agency admins can view billing data.' },
        { status: 403 }
      );
    }

    // Get all subscriptions for the agency
    const subscriptions = await ElderBillingService.getAllElderSubscriptions(agencyId);

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
