import z from "zod";

export const createCustomerSchema = z.object({
  email: z.email(),
  description: z.string().optional(),
  metadata: z.object({
    supabaseUserId: z.string(),
  }),
});

export const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string(),
});

export const createSubscriptionSchema = z.object({
  priceId: z.string(),
  paymentMethodId: z.string().optional(),
});

export const updateSubscriptionSchema = z.object({
  subscriptionId: z.string(),
});
