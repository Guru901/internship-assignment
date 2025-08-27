# Installation and running steps

1. Clone the repository
2. Install dependencies
3. Create a Supabase project
4. Copy .env.example to .env.local and update the environment variables
5. Run the development server

# Required environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
```

# How to fire webhooks

From your terminal run:

```bash
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

# Assumptions

1. You have a Stripe account
2. You have Stripe's cli installed.
3. You have a Supabase account
4. You have a Stripe webhooks set up
5. You have Supabase Edge Functions set up
6. You have Supabase Schema set up

## To Setup Supabase Schema

```sql
-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_invoice_id ON payments(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(stripe_customer_id);
```

Run this in supabase's SQL editor

## To Setup Supabase Edge Functions

Create a new Edge Function

```js
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@12.0.0";
import { createClient } from "jsr:@supabase/supabase-js@2";
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: "2024-11-20",
});
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? ""
);
const cryptoProvider = Stripe.createSubtleCryptoProvider();
console.log("Stripe Webhook Function booted!");
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type, stripe-signature",
      },
    });
  }
  const signature = request.headers.get("Stripe-Signature");
  if (!signature) {
    return new Response("Missing Stripe signature", {
      status: 400,
    });
  }
  const body = await request.text();
  let receivedEvent;
  try {
    receivedEvent = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET"),
      undefined,
      cryptoProvider
    );
  } catch (err) {
    console.error(`❌ Webhook signature verification failed:`, err);
    return new Response(`Webhook Error: ${err}`, {
      status: 400,
    });
  }
  console.log(`Event received: ${receivedEvent.type} - ${receivedEvent.id}`);
  try {
    switch (receivedEvent.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(receivedEvent.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(receivedEvent.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionCanceled(receivedEvent.data.object);
        break;
      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(receivedEvent.data.object);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(receivedEvent.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${receivedEvent.type}`);
    }
  } catch (error) {
    console.error("❌ Error handling webhook:", error);
    return new Response("Webhook handler failed", {
      status: 500,
    });
  }
  return new Response(
    JSON.stringify({
      received: true,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
});
function safeTimestampToISO(timestamp) {
  if (!timestamp || timestamp <= 0) return null;
  try {
    return new Date(timestamp * 1000).toISOString();
  } catch (error) {
    console.error("Invalid timestamp:", timestamp, error);
    return null;
  }
}
async function handleSubscriptionCreated(subscription) {
  console.log("Processing subscription created:", subscription.id);
  const { error } = await supabase.from("subscriptions").insert({
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    status: subscription.status,
    current_period_start: safeTimestampToISO(subscription.current_period_start),
    current_period_end: safeTimestampToISO(subscription.current_period_end),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("❌ Error inserting subscription:", error);
    throw error;
  }
  console.log("Subscription created in database");
}
async function handleSubscriptionUpdated(subscription) {
  console.log("Processing subscription updated:", subscription.id);
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      current_period_start: safeTimestampToISO(
        subscription.current_period_start
      ),
      current_period_end: safeTimestampToISO(subscription.current_period_end),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
  if (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }
  console.log("Subscription updated in database");
}
async function handleSubscriptionCanceled(subscription) {
  console.log("Processing subscription canceled:", subscription.id);
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
  if (error) {
    console.error("Error canceling subscription:", error);
    throw error;
  }
  console.log("Subscription canceled in database");
}
async function handlePaymentSucceeded(invoice) {
  console.log("Processing payment succeeded:", invoice.id);
  const { error } = await supabase.from("payments").insert({
    stripe_invoice_id: invoice.id,
    stripe_customer_id: invoice.customer,
    stripe_subscription_id: invoice.subscription,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: "succeeded",
    paid_at: safeTimestampToISO(invoice.status_transitions.paid_at),
    created_at: new Date().toISOString(),
  });
  if (error) {
    console.error("Error inserting payment:", error);
    throw error;
  }
  console.log("Payment success recorded in database");
}
async function handlePaymentFailed(invoice) {
  console.log("Processing payment failed:", invoice.id);
  const { error } = await supabase.from("payments").insert({
    stripe_invoice_id: invoice.id,
    stripe_customer_id: invoice.customer,
    stripe_subscription_id: invoice.subscription,
    amount: invoice.amount_due,
    currency: invoice.currency,
    status: "failed",
    created_at: new Date().toISOString(),
  });
  if (error) {
    console.error("Error inserting failed payment:", error);
    throw error;
  }
  console.log("Payment failure recorded in database");
}
```

Copy this code into the edge functions and don't forget to add the environment variables.
You would need to add the following environment variables:

- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

# Time spent

I have never used Supbase/Firebase, Webhooks or Stripe before. So it took me a while to figure out how to do this. I'm sure there are better ways to do this, but this is what I came up with.

It took me around 10-12 hrs to figure out how to do this.
