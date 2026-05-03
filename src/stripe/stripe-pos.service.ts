import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripePosService {
  private stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured (Stripe Terminal POS)');
    }
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2025-10-29.clover' as any,
    });
  }

  getStripe(): Stripe {
    return this.stripe;
  }

  async createPaymentIntent(amount: number) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      payment_method_types: ['card_present'],
      capture_method: 'automatic',
    });

    return {
      ok: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    };
  }

  async processPayment(readerId: string, paymentIntentId: string) {
    const reader = await this.stripe.terminal.readers.processPaymentIntent(
      readerId,
      {
        payment_intent: paymentIntentId,
        process_config: {
          enable_customer_cancellation: true,
        },
      },
    );

    return {
      ok: true,
      reader,
    };
  }

  async cancelPayment(readerId: string) {
    const reader = await this.stripe.terminal.readers.cancelAction(readerId);

    return {
      ok: true,
      reader,
    };
  }

  async createCustomer(name: string, email: string) {
    const customer = await this.stripe.customers.create({
      name,
      email,
    });

    return {
      ok: true,
      customerId: customer.id,
    };
  }

  async saveCardOnReader(readerId: string, customerId: string) {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card_present'],
    });

    const reader = await this.stripe.terminal.readers.processSetupIntent(
      readerId,
      {
        setup_intent: setupIntent.id,
        allow_redisplay: 'always',
      },
    );

    return {
      ok: true,
      setupIntentId: setupIntent.id,
      reader,
    };
  }

  async createMembershipSubscription(body: {
    customerId: string;
    setupIntentId: string;
    oneTimeItems?: any[];
    subscriptionItems?: any[];
  }) {
    const {
      customerId,
      setupIntentId,
      oneTimeItems = [],
      subscriptionItems = [],
    } = body;

    if (oneTimeItems.length === 0 && subscriptionItems.length === 0) {
      return {
        ok: false,
        error: 'No cart items were provided.',
        statusCode: 400,
      };
    }

    const setupIntent = await this.stripe.setupIntents.retrieve(setupIntentId, {
      expand: ['latest_attempt'],
    });

    if (setupIntent.status !== 'succeeded') {
      return {
        ok: false,
        error: `SetupIntent is not ready yet. Current status: ${setupIntent.status}`,
        statusCode: 400,
      };
    }

    const latestAttempt = setupIntent.latest_attempt as Stripe.SetupAttempt | null;
    const generatedCardId =
      latestAttempt &&
      latestAttempt.payment_method_details &&
      (latestAttempt.payment_method_details as any).card_present &&
      (latestAttempt.payment_method_details as any).card_present.generated_card;

    if (!generatedCardId) {
      return {
        ok: false,
        error:
          'No generated_card was created. Try inserting the physical card instead of tapping, or use a supported card.',
        statusCode: 400,
      };
    }

    await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: generatedCardId,
      },
    });

    const subscriptionLineItems = subscriptionItems.map((item: any) => {
      const amount = Number(item.amount);
      const defaultAmount = Number(item.defaultAmount);

      if (!item.priceId && !item.productId) {
        throw new Error(
          `Subscription item "${item.name}" is missing both priceId and productId.`,
        );
      }

      if (amount !== defaultAmount) {
        if (!item.productId) {
          throw new Error(
            `Subscription item "${item.name}" is missing productId for custom pricing.`,
          );
        }

        return {
          price_data: {
            currency: item.currency || 'usd',
            product: item.productId,
            recurring: {
              interval: item.interval || 'month',
            },
            unit_amount: amount,
          },
        };
      }

      return {
        price: item.priceId,
      };
    });

    const oneTimeInvoiceItems = oneTimeItems.map((item: any) => {
      const amount = Number(item.amount);
      const defaultAmount = Number(item.defaultAmount);

      if (!item.priceId && !item.productId) {
        throw new Error(
          `One-time item "${item.name}" is missing both priceId and productId.`,
        );
      }

      if (amount !== defaultAmount) {
        if (!item.productId) {
          throw new Error(
            `One-time item "${item.name}" is missing productId for custom pricing.`,
          );
        }

        return {
          price_data: {
            currency: item.currency || 'usd',
            product: item.productId,
            unit_amount: amount,
          },
        };
      }

      return {
        price: item.priceId,
      };
    });

    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: subscriptionLineItems,
      add_invoice_items: oneTimeInvoiceItems,
      default_payment_method: generatedCardId,
      payment_behavior: 'error_if_incomplete',
      metadata: {
        created_from: 'local_pos_s710',
      },
      expand: ['latest_invoice'],
    });

    const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;

    return {
      ok: true,
      generatedCardId,
      subscriptionId: subscription.id,
      invoiceId: latestInvoice ? latestInvoice.id : null,
      status: subscription.status,
    };
  }

  async catalogOneTime() {
    const prices = await this.stripe.prices.list({
      active: true,
      type: 'one_time',
      expand: ['data.product'],
      limit: 100,
    });

    return {
      ok: true,
      prices: prices.data.map((price) => {
        const product = price.product as Stripe.Product;
        return {
          id: price.id,
          productId: product.id,
          name: product.name,
          amount: price.unit_amount,
          currency: price.currency,
        };
      }),
    };
  }

  async catalogRecurring() {
    const prices = await this.stripe.prices.list({
      active: true,
      type: 'recurring',
      expand: ['data.product'],
      limit: 100,
    });

    return {
      ok: true,
      prices: prices.data.map((price) => {
        const product = price.product as Stripe.Product;
        return {
          id: price.id,
          productId: product.id,
          name: product.name,
          amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring!.interval,
        };
      }),
    };
  }
}
