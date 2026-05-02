import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyToken } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("mozbet_session")?.value;
    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const payload = await verifyToken<{ id: string; role: string }>(token);
    
    // Check if admin
    const { data: adminUser } = await supabaseAdmin
      .from("users")
      .select("is_admin, role")
      .eq("id", payload?.id)
      .single();

    if (!adminUser?.is_admin) {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { action, userId, balanceRetainedStatus } = await req.json();

    if (!action || !userId) {
      return NextResponse.json({ error: "Parâmetros insuficientes" }, { status: 400 });
    }

    // Ações exclusivas de Super Admin
    if (action === 'promote' || action === 'demote') {
      if (adminUser?.role !== 'super_admin') {
         return NextResponse.json({ error: "Apenas proprietários (Super Admins) podem gerir a equipa" }, { status: 403 });
      }
      
      const newRole = action === 'promote' ? 'admin' : 'user';
      const newIsAdmin = action === 'promote' ? true : false;
      
      const { error } = await supabaseAdmin.from("users").update({ role: newRole, is_admin: newIsAdmin }).eq("id", userId);
      if (error) throw error;
      
      if (action === 'promote' || action === 'demote') {
         const title = action === 'promote' ? "Promoção a Administrador" : "Aviso de Despromoção";
         const siteMsg = action === 'promote' 
           ? "Parabéns! Foi promovido a Administrador da MozBet." 
           : "A sua conta foi rebaixada para Utilizador comum.";
           
         // Notificação no site
         await supabaseAdmin.from("notifications").insert({
            user_id: userId,
            title: title,
            message: siteMsg,
            type: "SYSTEM"
         });
         
         // Notificação por E-mail
         const { data: targetUser } = await supabaseAdmin.from("users").select("email").eq("id", userId).single();
         if (targetUser?.email) {
            const RESEND_API_KEY = process.env.RESEND_API_KEY;
            if (RESEND_API_KEY) {
               const emailSubject = action === 'promote' ? "Promoção a Administrador - MozBet" : "Aviso de Conta - MozBet";
               const emailHtml = action === 'promote'
                 ? `<div style="font-family: sans-serif; padding: 20px;">
                     <h2>Promoção a Administrador 🎉</h2>
                     <p>Parabéns! A sua conta foi promovida a Administrador na plataforma MozBet pelo dono do projeto.</p>
                     <p>Já tem os acessos necessários. Pode entrar no Painel de Controlo em <a href="https://mozbet-test.vercel.app/admin">mozbet-test.vercel.app/admin</a>.</p>
                    </div>`
                 : `<div style="font-family: sans-serif; padding: 20px;">
                     <h2>Aviso de Privilégios ⚠️</h2>
                     <p>Os seus privilégios de Administrador foram revogados pelo dono do projeto.</p>
                     <p>A sua conta voltou ao estado de Utilizador comum e já não tem acesso ao Painel de Controlo.</p>
                    </div>`;

               await fetch("https://api.resend.com/emails", {
                 method: "POST",
                 headers: {
                   "Authorization": `Bearer ${RESEND_API_KEY}`,
                   "Content-Type": "application/json"
                 },
                 body: JSON.stringify({
                   from: "MozBet RH <onboarding@resend.dev>",
                   to: [targetUser.email],
                   subject: emailSubject,
                   html: emailHtml
                 })
               });
            }
         }
      }
      
      return NextResponse.json({ success: true, message: action === 'promote' ? "Utilizador promovido a Admin!" : "Administrador despromovido a Utilizador." });
    }

    if (action === 'delete') {
      const { error } = await supabaseAdmin.from("users").delete().eq("id", userId);
      if (error) throw error;
      return NextResponse.json({ success: true, message: "Conta apagada." });
    }

    const updates: any = {};
    if (action === 'ban') updates.is_active = false;
    if (action === 'suspend') updates.is_active = false;
    if (action === 'activate') updates.is_active = true;
    if (action === 'retain') updates.balance_retained = !balanceRetainedStatus;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseAdmin.from("users").update(updates).eq("id", userId);
      if (error) throw error;
      return NextResponse.json({ success: true, message: "Ação executada com sucesso." });
    }

    return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 });
  } catch (error: any) {
    console.error("Erro na ação de admin:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}
