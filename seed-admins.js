const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_USERS = [
  { phone: "840683435", password: "Roman700" },
  { phone: "858148698", password: "Roman700" },
];

async function seed() {
  console.log("Iniciando injeção de admins no banco de dados...");
  
  for (const admin of ADMIN_USERS) {
    const { data: existing, error: existError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phone", admin.phone)
      .single();

    if (existing) {
      await supabaseAdmin
        .from("users")
        .update({ is_admin: true, is_verified: true })
        .eq("phone", admin.phone);
      console.log(`✅ ${admin.phone} atualizado para ADMIN!`);
      continue;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(admin.password, salt);

    const { error } = await supabaseAdmin.from("users").insert({
      phone: admin.phone,
      password_hash: hashedPassword,
      balance: 0.00,
      has_deposited: false,
      is_admin: true,
      is_verified: true,
    });

    if (error) {
      console.error(`❌ Erro ao criar ${admin.phone}:`, error.message);
    } else {
      console.log(`✅ ${admin.phone} criado com sucesso como ADMIN!`);
    }
  }
  console.log("Concluído!");
}

seed();
