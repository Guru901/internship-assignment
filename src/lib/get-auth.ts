import { cache } from "react";
import { createClient } from "./supabase/server";

export const getAuth = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await (await supabase).auth.getUser();

  if (!user) {
    return null;
  }

  return user;
});
