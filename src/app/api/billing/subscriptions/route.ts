import { NextRequest, NextResponse } from 'next/server';
import { ElderBillingService } from '@/lib/stripe/elderBilling';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Get agencyId from query params
    const agencyId = req.nextUrl.searchParams.get('agencyId');
    if (!agencyId) {
      return NextResponse.json({ error: 'Agency ID required' }, { status: 400 });
    }

    // Get all subscriptions for the agency
    const subscriptions = await ElderBillingService.getAllElderSubscriptions(agencyId);

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
