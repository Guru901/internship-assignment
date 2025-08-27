import z from "zod";

export const createCustomerSchema = z.object({
  email: z.email(),
  description: z.string().optional(),
  metadata: z.object({
    supabaseUserId: z.string(),
  }),
});
