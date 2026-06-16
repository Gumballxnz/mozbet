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
    if (action === 'promote' || action === 'promote_owner' || action === 'demote') {
      if (adminUser?.role !== 'super_admin') {
         return NextResponse.json({ error: "Apenas proprietários (Super Admins) podem gerir a equipa" }, { status: 403 });
      }
      
      let newRole = 'user';
      let newIsAdmin = false;
      if (action === 'promote') {
        newRole = 'admin';
        newIsAdmin = true;
      } else if (action === 'promote_owner') {
        newRole = 'super_admin';
        newIsAdmin = true;
      }
      
      const { error } = await supabaseAdmin.from("users").update({ role: newRole, is_admin: newIsAdmin }).eq("id", userId);
      if (error) throw error;
      
      let title = "Aviso de Conta - MozBet";
      let siteMsg = "A sua conta foi atualizada.";
      let emailSubject = "Aviso de Conta - MozBet";
      let emailHtml = "";

      if (action === 'promote') {
        title = "Promoção a Administrador";
        siteMsg = "Parabéns! Foi promovido a Administrador da MozBet.";
        emailSubject = "Promoção a Administrador - MozBet";
        emailHtml = `<div style="font-family: sans-serif; padding: 20px;">
                      <h2>Promoção a Administrador 🎉</h2>
                      <p>Parabéns! A sua conta foi promovida a Administrador na plataforma MozBet pelo dono do projeto.</p>
                      <p>Já tem os acessos necessários. Pode entrar no Painel de Controlo em <a href="https://mozbet.online/admin">mozbet.online/admin</a>.</p>
                     </div>`;
      } else if (action === 'promote_owner') {
        title = "Promoção a Proprietário";
        siteMsg = "Parabéns! Foi promovido a Proprietário (Dono) da MozBet.";
        emailSubject = "Promoção a Proprietário - MozBet";
        emailHtml = `<div style="font-family: sans-serif; padding: 20px;">
                      <h2>Promoção a Proprietário 🎉</h2>
                      <p>Parabéns! A sua conta foi promovida a Proprietário (Dono) na plataforma MozBet.</p>
                      <p>Agora tem privilégios totais sobre a gestão da equipa. Acesse o Painel de Controlo em <a href="https://mozbet.online/admin">mozbet.online/admin</a>.</p>
                     </div>`;
      } else {
        title = "Aviso de Despromoção";
        siteMsg = "A sua conta foi rebaixada para Utilizador comum.";
        emailSubject = "Aviso de Conta - MozBet";
        emailHtml = `<div style="font-family: sans-serif; padding: 20px;">
                      <h2>Aviso de Privilégios ⚠️</h2>
                      <p>Os seus privilégios administrativos foram revogados pelo dono do projeto.</p>
                      <p>A sua conta voltou ao estado de Utilizador comum e já não tem acesso ao Painel de Controlo.</p>
                     </div>`;
      }
         
      // Notificação no site
      await supabaseAdmin.from("notifications").insert({
         user_id: userId,
         title: title,
         message: siteMsg,
         type: "SYSTEM"
      });
      
      // Notificação por E-mail
      const { data: targetUser } = await supabaseAdmin.from("users").select("email").eq("id", userId).single();
      if (targetUser?.email && emailHtml) {
         const RESEND_API_KEY = process.env.RESEND_API_KEY;
         if (RESEND_API_KEY) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                from: "MozBet RH <suporte@mozbet.online>",
                to: [targetUser.email],
                subject: emailSubject,
                html: emailHtml
              })
            });
         }
      }
      
      let returnMsg = "Utilizador promovido a Admin!";
      if (action === 'promote_owner') returnMsg = "Utilizador promovido a Proprietário!";
      if (action === 'demote') returnMsg = "Administrador despromovido a Utilizador.";

      return NextResponse.json({ success: true, message: returnMsg });
    }

    if (action === 'update_affiliate_percent') {
      const { affiliatePercent } = await req.json();
      if (affiliatePercent === undefined || isNaN(Number(affiliatePercent))) {
        return NextResponse.json({ error: "Porcentagem de comissão inválida" }, { status: 400 });
      }
      const percent = Number(affiliatePercent);
      if (percent < 0 || percent > 100) {
        return NextResponse.json({ error: "A comissão deve ser entre 0% e 100%" }, { status: 400 });
      }
      const { error } = await supabaseAdmin
        .from("users")
        .update({ affiliate_percent: percent })
        .eq("id", userId);
        
      if (error) throw error;
      return NextResponse.json({ success: true, message: `Comissão do afiliado alterada para ${percent}% com sucesso!` });
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
