import { randomUUID } from 'crypto';
import { createHmac } from 'crypto';
import { websiteConfig } from '@/config/website';
import {
  addCredits,
  addSubscriptionCredits,
} from '@/credits/credits';
import { getCreditPackageById } from '@/credits/server';
import { CREDIT_TRANSACTION_TYPE } from '@/credits/types';
import { getDb } from '@/db';
import { payment, user } from '@/db/schema';
import { findPlanByPlanId, findPriceInPlan } from '@/lib/price-plan';
import { sendNotification } from '@/notification/notification';
import { desc, eq } from 'drizzle-orm';
import { Creem } from 'creem';
import {
  type CheckoutResult,
  type CreateCheckoutParams,
  type CreateCreditCheckoutParams,
  type CreatePortalParams,
  type PaymentProvider,
  PaymentScenes,
  type PaymentStatus,
  PaymentTypes,
  PlanIntervals,
  type PortalResult,
} from '../types';

/**
 * Creem payment provider implementation
 */
export class CreemProvider implements PaymentProvider {
  private creem: Creem;
  private webhookSecret: string;

  constructor() {
    const apiKey = process.env.CREEM_API_KEY;
    if (!apiKey) {
      throw new Error('CREEM_API_KEY environment variable is not set');
    }

    const webhookSecret = process.env.CREEM_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('CREEM_WEBHOOK_SECRET environment variable is not set');
    }

    this.creem = new Creem({ apiKey });
    this.webhookSecret = webhookSecret;
  }

  private async updateUserWithCustomerId(
    customerId: string,
    email: string
  ): Promise<void> {
    try {
      const db = await getDb();
      await db
        .update(user)
        .set({
          customerId: customerId,
          updatedAt: new Date(),
        })
        .where(eq(user.email, email));
    } catch (error) {
      console.error('Update user with customer ID error:', error);
      throw new Error('Failed to update user with customer ID');
    }
  }

  private async findUserIdByCustomerId(
    customerId: string
  ): Promise<string | undefined> {
    try {
      const db = await getDb();
      const result = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.customerId, customerId))
        .limit(1);

      if (result.length > 0) {
        return result[0].id;
      }
      return undefined;
    } catch (error) {
      console.error('Find user by customer ID error:', error);
      return undefined;
    }
  }

  public async createCheckout(
    params: CreateCheckoutParams
  ): Promise<CheckoutResult> {
    const {
      planId,
      priceId,
      customerEmail,
      successUrl,
      cancelUrl,
      metadata,
    } = params;

    try {
      const plan = findPlanByPlanId(planId);
      if (!plan) {
        throw new Error(`Plan with ID ${planId} not found`);
      }

      const price = findPriceInPlan(planId, priceId);
      if (!price) {
        throw new Error(`Price ID ${priceId} not found in plan ${planId}`);
      }

      const session = await this.creem.checkouts.create({
        productId: priceId,
        successUrl: successUrl ?? '',
        requestId: randomUUID(),
        metadata: {
          ...metadata,
          planId,
          priceId,
          customerEmail,
        },
      });

      // Update user with customer ID if available
      const customerId = typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;
      if (customerId && customerEmail) {
        await this.updateUserWithCustomerId(customerId, customerEmail);
      }

      return {
        url: session.checkoutUrl ?? '',
        id: session.id ?? randomUUID(),
      };
    } catch (error) {
      console.error('Create checkout session error:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  public async createCreditCheckout(
    params: CreateCreditCheckoutParams
  ): Promise<CheckoutResult> {
    const {
      packageId,
      priceId,
      customerEmail,
      successUrl,
      cancelUrl,
      metadata,
    } = params;

    try {
      const creditPackage = getCreditPackageById(packageId);
      if (!creditPackage) {
        throw new Error(`Credit package with ID ${packageId} not found`);
      }

      const session = await this.creem.checkouts.create({
        productId: priceId,
        successUrl: successUrl ?? '',
        requestId: randomUUID(),
        metadata: {
          ...metadata,
          packageId,
          priceId,
          customerEmail,
          type: 'credit_purchase',
          credits: String(creditPackage.amount),
        },
      });

      const customerId = typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;
      if (customerId && customerEmail) {
        await this.updateUserWithCustomerId(customerId, customerEmail);
      }

      return {
        url: session.checkoutUrl ?? '',
        id: session.id ?? randomUUID(),
      };
    } catch (error) {
      console.error('Create credit checkout session error:', error);
      throw new Error('Failed to create credit checkout session');
    }
  }

  public async createCustomerPortal(
    params: CreatePortalParams
  ): Promise<PortalResult> {
    // Creem does not have a customer portal like Stripe
    // Return the Creem dashboard URL instead
    return {
      url: 'https://app.creem.io/dashboard',
    };
  }

  public async handleWebhookEvent(
    payload: string,
    signature: string
  ): Promise<void> {
    try {
      // Verify webhook signature
      const expectedSignature = createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      if (signature !== expectedSignature) {
        throw new Error('Invalid webhook signature');
      }

      const event = JSON.parse(payload);
      const eventType = event.event_type ?? event.type;
      console.log(`handle creem webhook event, type: ${eventType}`);

      switch (eventType) {
        case 'checkout.completed': {
          await this.onCheckoutCompleted(event.data ?? event.object);
          break;
        }
        case 'subscription.active': {
          await this.onSubscriptionActive(event.data ?? event.object);
          break;
        }
        case 'subscription.canceled':
        case 'subscription.cancelled': {
          await this.onSubscriptionCanceled(event.data ?? event.object);
          break;
        }
        case 'subscription.renewed': {
          await this.onSubscriptionRenewed(event.data ?? event.object);
          break;
        }
        default: {
          console.log(`Unhandled creem event type: ${eventType}`);
        }
      }
    } catch (error) {
      console.error('handle creem webhook event error:', error);
      throw new Error('Failed to handle webhook event');
    }
  }

  private async onCheckoutCompleted(data: any): Promise<void> {
    console.log('>> Handle creem checkout completed');

    const metadata = data.metadata ?? {};
    const userId = metadata.userId;
    const customerId = data.customer?.id ?? data.customer_id ?? '';
    const priceId = metadata.priceId ?? data.product_id ?? '';
    const isCreditPurchase = metadata.type === 'credit_purchase';
    const isSubscription = !!data.subscription_id;
    const customerEmail = metadata.customerEmail;

    if (customerEmail && customerId) {
      await this.updateUserWithCustomerId(customerId, customerEmail);
    }

    const currentDate = new Date();
    const db = await getDb();

    try {
      if (isSubscription) {
        await db.insert(payment).values({
          id: randomUUID(),
          priceId,
          type: PaymentTypes.SUBSCRIPTION,
          scene: PaymentScenes.SUBSCRIPTION,
          interval: PlanIntervals.MONTH,
          userId,
          customerId,
          subscriptionId: data.subscription_id,
          sessionId: data.id ?? null,
          invoiceId: data.id ?? null,
          paid: true,
          status: 'active',
          periodStart: currentDate,
          periodEnd: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000),
          createdAt: currentDate,
          updatedAt: currentDate,
        });

        if (websiteConfig.credits?.enableCredits) {
          await addSubscriptionCredits(userId, priceId);
        }
      } else {
        const scene = isCreditPurchase
          ? PaymentScenes.CREDIT
          : PaymentScenes.LIFETIME;

        await db.insert(payment).values({
          id: randomUUID(),
          priceId,
          type: PaymentTypes.ONE_TIME,
          scene,
          userId,
          customerId,
          sessionId: data.id ?? null,
          invoiceId: data.id ?? null,
          paid: true,
          status: 'completed',
          createdAt: currentDate,
          updatedAt: currentDate,
        });

        if (isCreditPurchase) {
          const packageId = metadata.packageId;
          const credits = metadata.credits;
          if (packageId && credits) {
            const creditPackage = getCreditPackageById(packageId);
            await addCredits({
              userId,
              amount: Number.parseInt(credits),
              type: CREDIT_TRANSACTION_TYPE.PURCHASE_PACKAGE,
              description: `+${credits} credits for package ${packageId}`,
              paymentId: data.id,
              expireDays: creditPackage?.expireDays,
            });
          }
        }
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('unique constraint')
      ) {
        console.log('Payment record already exists, skipping creation');
        return;
      }
      throw error;
    }

    console.log('<< Handle creem checkout completed success');
  }

  private async onSubscriptionActive(data: any): Promise<void> {
    console.log('>> Handle creem subscription active:', data.id);

    const db = await getDb();
    const subscriptionId = data.id;

    if (subscriptionId) {
      await db
        .update(payment)
        .set({
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(payment.subscriptionId, subscriptionId));
    }

    console.log('<< Handle creem subscription active success');
  }

  private async onSubscriptionCanceled(data: any): Promise<void> {
    console.log('>> Handle creem subscription canceled:', data.id);

    const db = await getDb();
    const subscriptionId = data.id;

    if (subscriptionId) {
      await db
        .update(payment)
        .set({
          status: 'canceled',
          cancelAtPeriodEnd: true,
          updatedAt: new Date(),
        })
        .where(eq(payment.subscriptionId, subscriptionId));
    }

    console.log('<< Handle creem subscription canceled success');
  }

  private async onSubscriptionRenewed(data: any): Promise<void> {
    console.log('>> Handle creem subscription renewed:', data.id);

    const db = await getDb();
    const subscriptionId = data.id;
    const currentDate = new Date();

    if (subscriptionId) {
      // Update payment record
      await db
        .update(payment)
        .set({
          status: 'active',
          periodStart: currentDate,
          periodEnd: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000),
          updatedAt: currentDate,
        })
        .where(eq(payment.subscriptionId, subscriptionId));

      // Find user and add subscription credits
      const paymentRecords = await db
        .select()
        .from(payment)
        .where(eq(payment.subscriptionId, subscriptionId))
        .limit(1);

      if (paymentRecords.length > 0 && websiteConfig.credits?.enableCredits) {
        await addSubscriptionCredits(
          paymentRecords[0].userId,
          paymentRecords[0].priceId
        );
      }
    }

    console.log('<< Handle creem subscription renewed success');
  }
}
