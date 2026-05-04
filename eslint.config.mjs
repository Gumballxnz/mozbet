import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Scripts utilitários (usam require() e não fazem parte do app Next.js)
    "scratch/**",
    "scripts/**",
  ]),
  {
    // Regras customizadas para o projeto MozBet
    rules: {
      // Permitir 'any' como warning (usado em callbacks de socket, Supabase Realtime, etc.)
      "@typescript-eslint/no-explicit-any": "warn",
      // Ignorar variáveis não utilizadas em catches (_e, _error, etc.) e args prefixados com _
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_|^error$|^err$|^e$",
      }],
      // Interfaces vazias herdando HTMLAttributes são padrão do shadcn/ui
      "@typescript-eslint/no-empty-object-type": "off",
      // Aspas em JSX não precisam de escape obrigatório
      "react/no-unescaped-entities": "off",
      // Permitir setState em effects como warning (padrão comum em jogos com timers)
      "react-hooks/set-state-in-effect": "warn",
      // Componentes criados durante render (BetPanel inline) — corrigiremos os críticos
      "react-hooks/static-components": "warn",
      // Acesso a variáveis antes da declaração (hoisting) — corrigiremos nos jogos
      "react-hooks/immutability": "warn",
      // Pureza de render (Math.random em valores iniciais de useState/useRef é seguro)
      "react-hooks/purity": "warn",
      // Acesso a refs no corpo do componente (padrão comum para valores estáveis)
      "react-hooks/refs": "warn",
    },
  },
]);

export default eslintConfig;
