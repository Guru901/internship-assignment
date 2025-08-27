import z from "zod";

export const createCustomerSchema = z.object({
  email: z.string().email(),
  description: z.string().optional(),
  metadata: z.object({
    supabaseUserId: z.string(),
  }),
});
