import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: Request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const {
      customerId,
      priceId,
      paymentMethodId,
    }: { customerId: string; priceId: string; paymentMethodId?: string } =
      await request.json();

    if (!customerId || !priceId) {
      return NextResponse.json(
        { error: "customerId and priceId are required" },
        { status: 400 }
      );
    }

    const customer = await stripe.customers.retrieve(customerId);
    if (!("id" in customer)) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    let defaultPaymentMethodId = paymentMethodId;

    // If no payment method is provided, we have a few options for testing
    if (!defaultPaymentMethodId) {
      try {
        // Create a new test payment method using test token
        const paymentMethod = await stripe.paymentMethods.create({
          type: "card",
          card: { token: "tok_visa" }, // Use Stripe's test token
        });

        // Attach the payment method to the customer
        await stripe.paymentMethods.attach(paymentMethod.id, {
          customer: customer.id,
        });

        // Set as customer's default payment method
        await stripe.customers.update(customer.id, {
          invoice_settings: { default_payment_method: paymentMethod.id },
        });

        defaultPaymentMethodId = paymentMethod.id;
      } catch (attachError) {
        console.error("Failed to set up test payment method:", attachError);

        // Reset defaultPaymentMethodId to undefined if setup failed
        defaultPaymentMethodId = undefined;
        console.log(
          "Proceeding without payment method - subscription may require manual payment"
        );
      }
    }

    // Verify the payment method is attached before creating subscription
    if (defaultPaymentMethodId) {
      try {
        const paymentMethod = await stripe.paymentMethods.retrieve(
          defaultPaymentMethodId
        );
        if (paymentMethod.customer !== customer.id) {
          await stripe.paymentMethods.attach(defaultPaymentMethodId, {
            customer: customer.id,
          });
        }
      } catch (pmError) {
        console.error("Payment method verification failed:", pmError);
      }
    }

    const params: Stripe.SubscriptionCreateParams = {
      customer: customer.id,
      items: [{ price: priceId }],
      collection_method: "charge_automatically",
      expand: ["latest_invoice.payment_intent"], // Expand for more details
    };

    // Only add payment method if we have one
    if (defaultPaymentMethodId) {
      params.default_payment_method = defaultPaymentMethodId;
    }

    const subscription = await stripe.subscriptions.create(params);

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
      status: subscription.status,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);

    // More detailed error handling
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        {
          error: error.message,
          type: error.type,
          code: error.code,
        },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
