import { handleWebhookEvent } from '@/payment';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Creem webhook handler
 * This endpoint receives webhook events from Creem and processes them
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const payload = await req.text();
  const signature = req.headers.get('creem-signature') ?? req.headers.get('x-creem-signature') ?? '';

  try {
    if (!payload) {
      return NextResponse.json(
        { error: 'Missing webhook payload' },
        { status: 400 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Creem signature' },
        { status: 400 }
      );
    }

    await handleWebhookEvent(payload, signature);

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error in creem webhook route:', error);

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}
