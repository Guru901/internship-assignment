import { cache } from "react";
import { createClient } from "./supabase/server";

export const getAuth = cache(async () => {
  const supabase = createClient();
  const { data } = await (await supabase).auth.getSession();

  if (!data) {
    return null;
  }

  return data;
});
