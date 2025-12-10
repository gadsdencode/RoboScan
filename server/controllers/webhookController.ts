// server/controllers/webhookController.ts
// Handles Stripe webhook events for subscription lifecycle management

import { Router, Request, Response } from "express";
import { storage } from "../storage.js";
import { getStripe } from "../utils/stripe.js";
import Stripe from "stripe";

const router = Router();

/**
 * Error types for webhook processing
 * - Retryable: Database connection issues, temporary failures - return 5xx
 * - Non-retryable: User not found, invalid data - return 200 to prevent infinite retries
 */
class RetryableWebhookError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'RetryableWebhookError';
  }
}

class NonRetryableWebhookError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'NonRetryableWebhookError';
  }
}

/**
 * Determine if an error is retryable based on its type
 * Database connection errors, network timeouts should be retried
 * Business logic errors (user not found) should not be retried
 */
function isRetryableError(error: unknown): boolean {
  // Explicitly marked as retryable
  if (error instanceof RetryableWebhookError) {
    return true;
  }
  
  // Explicitly marked as non-retryable
  if (error instanceof NonRetryableWebhookError) {
    return false;
  }
  
  // Check for common retryable error patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const retryablePatterns = [
      'connection',
      'timeout',
      'econnrefused',
      'econnreset',
      'socket',
      'network',
      'database',
      'deadlock',
      'pool',
      'too many connections',
    ];
    
    return retryablePatterns.some(pattern => message.includes(pattern));
  }
  
  // Default to non-retryable to prevent infinite retry loops
  return false;
}

/**
 * POST /api/webhooks/stripe
 * Stripe webhook endpoint - handles subscription lifecycle events
 * 
 * IMPORTANT: This endpoint must receive the raw body for signature verification
 * The raw body middleware is configured in index.ts
 */
router.post('/stripe', async (req: Request, res: Response) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event: Stripe.Event;

  try {
    // Verify the webhook signature using rawBody stored by express.json middleware
    // Access rawBody from the request (set in server/index.ts)
    const rawBody = (req as any).rawBody;
    
    if (!rawBody) {
      throw new Error('No raw body found - webhook signature verification requires raw request body');
    }
    
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      webhookSecret
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Webhook] Signature verification failed: ${message}`);
    return res.status(400).json({ error: `Webhook signature verification failed: ${message}` });
  }

  // Check for duplicate event processing (idempotency)
  const existingEvent = await storage.getSubscriptionEventByStripeId(event.id);
  if (existingEvent) {
    console.log(`[Webhook] Event ${event.id} already processed, skipping`);
    return res.json({ received: true, duplicate: true });
  }

  console.log(`[Webhook] Processing event: ${event.type} (${event.id})`);

  try {
    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.paused':
        await handleSubscriptionPaused(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.resumed':
        await handleSubscriptionResumed(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    // Log the event for auditing
    const subscription = await getSubscriptionFromEvent(event);
    await storage.createSubscriptionEvent({
      subscriptionId: subscription?.id || null,
      stripeEventId: event.id,
      eventType: event.type,
      eventData: event.data.object as Record<string, any>,
    });

    res.json({ received: true });
  } catch (error) {
    console.error(`[Webhook] Error processing event ${event.id}:`, error);
    
    // Determine if error is retryable
    const shouldRetry = isRetryableError(error);
    
    if (shouldRetry) {
      // Return 500 to trigger Stripe retry for transient errors
      // Stripe will retry with exponential backoff
      console.error(`[Webhook] Retryable error for event ${event.id} - returning 500 for retry`);
      return res.status(500).json({ 
        error: 'Temporary processing error, please retry' 
      });
    }
    
    // For non-retryable errors, log and acknowledge to prevent infinite retries
    // The event ID is logged for investigation
    console.error(`[Webhook] Non-retryable error for event ${event.id} - acknowledging to prevent retry`);
    
    // Still try to log the event for audit trail (with error status)
    try {
      const subscription = await getSubscriptionFromEvent(event);
      await storage.createSubscriptionEvent({
        subscriptionId: subscription?.id || null,
        stripeEventId: event.id,
        eventType: event.type,
        eventData: {
          ...event.data.object as Record<string, any>,
          _processingError: error instanceof Error ? error.message : 'Unknown error',
          _processingFailed: true,
        },
      });
    } catch (auditError) {
      console.error(`[Webhook] Failed to log audit event for ${event.id}:`, auditError);
    }
    
    // Return 200 to acknowledge receipt and prevent retries for non-recoverable errors
    res.json({ received: true, processed: false });
  }
});

/**
 * Helper: Get local subscription record from event
 */
async function getSubscriptionFromEvent(event: Stripe.Event) {
  const data = event.data.object as any;
  
  if (data.object === 'subscription') {
    return storage.getSubscriptionByStripeId(data.id);
  }
  
  // In Stripe v20, invoice subscription is accessed via parent.subscription_details
  if (data.object === 'invoice') {
    const subscriptionRef = data.parent?.subscription_details?.subscription;
    if (subscriptionRef) {
      const subscriptionId = typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef.id;
      return storage.getSubscriptionByStripeId(subscriptionId);
    }
  }
  
  return null;
}

/**
 * Helper: Get user ID from Stripe subscription metadata or customer
 */
async function getUserIdFromSubscription(subscription: Stripe.Subscription): Promise<string | null> {
  // First, try metadata
  if (subscription.metadata?.userId) {
    return subscription.metadata.userId;
  }

  // Otherwise, look up by customer ID
  const customerId = typeof subscription.customer === 'string' 
    ? subscription.customer 
    : subscription.customer.id;

  const user = await storage.getUserByStripeCustomerId(customerId);
  return user?.id || null;
}

/**
 * Handle: customer.subscription.created
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = await getUserIdFromSubscription(subscription);
  
  if (!userId) {
    // Non-retryable: User doesn't exist, retrying won't help
    throw new NonRetryableWebhookError(
      `No user found for subscription ${subscription.id} - customer may not be linked`
    );
  }

  // Check if we already have this subscription
  const existing = await storage.getSubscriptionByStripeId(subscription.id);
  if (existing) {
    console.log(`[Webhook] Subscription ${subscription.id} already exists, updating`);
    await updateSubscriptionFromStripe(subscription);
    return;
  }

  // Get the first item's price and product
  const item = subscription.items.data[0];
  const priceId = item?.price?.id || '';
  const productId = typeof item?.price?.product === 'string' 
    ? item.price.product 
    : item?.price?.product?.id || '';

  // In Stripe v20, current_period_start/end are on subscription items
  const firstItem = subscription.items.data[0];
  const currentPeriodStart = firstItem?.current_period_start;
  const currentPeriodEnd = firstItem?.current_period_end;

  await storage.createSubscription({
    userId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    stripeProductId: productId,
    status: subscription.status,
    currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart * 1000) : null,
    currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
  });

  console.log(`[Webhook] Created subscription ${subscription.id} for user ${userId}`);
}

/**
 * Handle: customer.subscription.updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await updateSubscriptionFromStripe(subscription);
  console.log(`[Webhook] Updated subscription ${subscription.id} - status: ${subscription.status}`);
}

/**
 * Handle: customer.subscription.deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await updateSubscriptionFromStripe(subscription);
  console.log(`[Webhook] Subscription ${subscription.id} has been deleted/canceled`);
}

/**
 * Handle: customer.subscription.paused
 */
async function handleSubscriptionPaused(subscription: Stripe.Subscription) {
  await updateSubscriptionFromStripe(subscription);
  console.log(`[Webhook] Subscription ${subscription.id} has been paused`);
}

/**
 * Handle: customer.subscription.resumed
 */
async function handleSubscriptionResumed(subscription: Stripe.Subscription) {
  await updateSubscriptionFromStripe(subscription);
  console.log(`[Webhook] Subscription ${subscription.id} has been resumed`);
}

/**
 * Handle: customer.subscription.trial_will_end
 * Sent 3 days before trial ends
 */
async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const userId = await getUserIdFromSubscription(subscription);
  
  if (!userId) {
    // Non-retryable: User doesn't exist
    throw new NonRetryableWebhookError(
      `No user found for subscription ${subscription.id} - cannot send trial notification`
    );
  }

  // Create a notification for the user
  await storage.createNotification({
    userId,
    type: 'trial_ending',
    title: 'Your trial is ending soon',
    message: `Your free trial will end on ${new Date(subscription.trial_end! * 1000).toLocaleDateString()}. Add a payment method to continue your subscription.`,
    changes: {
      subscriptionId: subscription.id,
      trialEnd: subscription.trial_end ?? null,
    } as any,
  });

  console.log(`[Webhook] Trial ending notification sent for subscription ${subscription.id}`);
}

/**
 * Handle: invoice.paid
 * Sent when a subscription invoice is successfully paid
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // In Stripe v20, subscription is accessed via parent.subscription_details
  const subscriptionDetails = invoice.parent?.subscription_details;
  if (!subscriptionDetails?.subscription) {
    console.log(`[Webhook] Invoice ${invoice.id} is not for a subscription`);
    return;
  }

  const subscriptionId = typeof subscriptionDetails.subscription === 'string'
    ? subscriptionDetails.subscription
    : subscriptionDetails.subscription.id;

  // Update subscription status to active
  const subscription = await storage.getSubscriptionByStripeId(subscriptionId);
  if (subscription) {
    await storage.updateSubscription(subscriptionId, {
      status: 'active',
    });
    console.log(`[Webhook] Invoice ${invoice.id} paid - subscription ${subscriptionId} is active`);
  }
}

/**
 * Handle: invoice.payment_failed
 * Sent when a subscription payment fails
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // In Stripe v20, subscription is accessed via parent.subscription_details
  const subscriptionDetails = invoice.parent?.subscription_details;
  if (!subscriptionDetails?.subscription) {
    console.log(`[Webhook] Invoice ${invoice.id} is not for a subscription`);
    return;
  }

  const subscriptionId = typeof subscriptionDetails.subscription === 'string'
    ? subscriptionDetails.subscription
    : subscriptionDetails.subscription.id;

  const subscription = await storage.getSubscriptionByStripeId(subscriptionId);
  if (!subscription) {
    // Non-retryable: Subscription doesn't exist locally
    throw new NonRetryableWebhookError(
      `No subscription found for invoice ${invoice.id} - subscription may have been created externally`
    );
  }

  // Create a notification for the user
  await storage.createNotification({
    userId: subscription.userId,
    type: 'payment_failed',
    title: 'Payment failed',
    message: 'We were unable to process your subscription payment. Please update your payment method to avoid service interruption.',
    changes: {
      subscriptionId: subscriptionId,
      invoiceId: invoice.id ?? null,
      amount: invoice.amount_due ?? 0,
    } as any,
  });

  console.log(`[Webhook] Payment failed notification sent for invoice ${invoice.id}`);
}

/**
 * Handle: customer.created
 * Link new Stripe customer to existing user if metadata matches
 */
async function handleCustomerCreated(customer: Stripe.Customer) {
  const userId = customer.metadata?.userId;
  
  if (userId) {
    const user = await storage.getUser(userId);
    if (user && !user.stripeCustomerId) {
      await storage.updateUserStripeCustomerId(userId, customer.id);
      console.log(`[Webhook] Linked Stripe customer ${customer.id} to user ${userId}`);
    }
  }
}

/**
 * Helper: Update local subscription record from Stripe data
 */
async function updateSubscriptionFromStripe(subscription: Stripe.Subscription) {
  const existing = await storage.getSubscriptionByStripeId(subscription.id);
  
  if (!existing) {
    // If subscription doesn't exist locally, create it
    console.log(`[Webhook] Subscription ${subscription.id} not found locally, creating...`);
    await handleSubscriptionCreated(subscription);
    return;
  }

  // Get the first item's price
  const item = subscription.items.data[0];
  const priceId = item?.price?.id || existing.stripePriceId;
  const productId = typeof item?.price?.product === 'string' 
    ? item.price.product 
    : item?.price?.product?.id || existing.stripeProductId;

  // In Stripe v20, current_period_start/end are on subscription items
  const firstItemUpdate = subscription.items.data[0];
  const periodStart = firstItemUpdate?.current_period_start;
  const periodEnd = firstItemUpdate?.current_period_end;

  await storage.updateSubscription(subscription.id, {
    stripePriceId: priceId,
    stripeProductId: productId || null,
    status: subscription.status,
    currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
  });
}

export default router;
