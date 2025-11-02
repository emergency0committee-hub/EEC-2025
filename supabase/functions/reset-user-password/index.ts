import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "https://esm.sh/@supabase/auth-helpers-shared@0.5.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type ResetPayload = {
  userId?: string;
  newPassword?: string;
};

const requiredEnv = ["SUPABASE_URL", "SERVICE_ROLE_KEY", "ADMIN_RESET_TOKEN"] as const;

function getEnv(name: (typeof requiredEnv)[number]): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const allowedToken = getEnv("ADMIN_RESET_TOKEN");
    if (!token || token !== allowedToken) {
      return new Response("Unauthorized", {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as ResetPayload;
    const userId = payload.userId?.trim();
    const newPassword = payload.newPassword?.trim() ?? "";

    if (!userId || newPassword.length < 6) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceRoleKey = getEnv("SERVICE_ROLE_KEY");

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error("Password reset error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Password reset handler error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
