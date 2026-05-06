import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.11.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizeRole = (value: string | null | undefined): string => {
  if (!value) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error("Ambiente incompleto para executar a função.");
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "Token ausente." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const jwt = authHeader.slice(7);
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user: requester },
      error: requesterError,
    } = await anonClient.auth.getUser(jwt);

    if (requesterError || !requester) {
      return new Response(JSON.stringify({ error: "Token inválido." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: requesterMember, error: requesterMemberError } = await serviceClient
      .from("members")
      .select("id, role, church_id")
      .eq("user_id", requester.id)
      .maybeSingle();

    if (requesterMemberError || !requesterMember) {
      return new Response(JSON.stringify({ error: "Perfil do solicitante não encontrado." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const normalizedRequesterRole = normalizeRole(requesterMember.role);
    const isMaster = normalizedRequesterRole === "MASTER ADMIN" || normalizedRequesterRole === "MASTER_ADMIN";
    const isChurchAdmin = normalizedRequesterRole === "ADMINISTRADOR DA IGREJA" || normalizedRequesterRole === "CHURCH_ADMIN";

    if (!isMaster && !isChurchAdmin) {
      return new Response(JSON.stringify({ error: "Sem permissão para esta operação." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const body = await req.json();
    const { email, password, action } = body || {};

    if (action !== "update_password") {
      return new Response(JSON.stringify({ error: "Ação não suportada." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return new Response(JSON.stringify({ error: "Email e senha são obrigatórios." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "Senha deve ter pelo menos 8 caracteres." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data: userList, error: listUsersError } = await serviceClient.auth.admin.listUsers();
    if (listUsersError) throw listUsersError;

    const targetAuthUser = userList.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (!targetAuthUser) {
      return new Response(JSON.stringify({ error: "Usuário alvo não encontrado." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (!isMaster) {
      const { data: targetMember, error: targetMemberError } = await serviceClient
        .from("members")
        .select("church_id")
        .eq("user_id", targetAuthUser.id)
        .maybeSingle();

      if (targetMemberError || !targetMember || targetMember.church_id !== requesterMember.church_id) {
        return new Response(JSON.stringify({ error: "Sem permissão para alterar este usuário." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }
    }

    const { error: updateError } = await serviceClient.auth.admin.updateUserById(targetAuthUser.id, {
      password,
    });
    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Erro interno." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
