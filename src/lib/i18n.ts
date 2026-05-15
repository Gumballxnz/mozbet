// Sistema de internacionalização — MOZBET
// Idiomas: PT (padrão) e EN

export type Locale = "pt" | "en";

export const translations = {
  pt: {
    // Geral
    brand: "MOZBET",
    slogan: "A melhor experiência de jogos online",
    loading: "Carregando...",
    loadingGame: "Carregando jogo...",
    close: "Fechar",
    back: "Voltar",
    save: "Guardar",
    cancel: "Cancelar",
    confirm: "Confirmar",
    error: "Erro",
    success: "Sucesso",

    // Header
    enter: "Entrar",
    register: "Registrar",
    deposit: "Depositar",
    currency: "MZN",

    // Auth
    createAccount: "Criar Conta",
    welcomeBack: "Bem-vindo de volta",
    joinPlayers: "Junte-se a milhares de jogadores e comece a ganhar hoje",
    enterAccount: "Entre na sua conta para continuar",
    phone: "Número de Telefone",
    password: "Palavra-passe",
    alreadyHaveAccount: "Já tem uma conta?",
    dontHaveAccount: "Não tem uma conta?",
    phoneMustBe9: "O número de telefone deve conter exatamente 9 dígitos",
    invalidPrefix: "O número deve começar com",
    passwordMin: "A palavra-passe deve ter pelo menos 4 caracteres",
    phoneExists: "Este número já se encontra registado. Faça login.",
    wrongCredentials: "Número ou palavra-passe incorretos.",
    accountNotFound: "Conta não encontrada. Registe-se primeiro.",
    unexpectedError: "Erro inesperado. Tente novamente.",
    loginRequired: "O login é obrigatório para jogar a dinheiro real.",
    bestExperience: "A melhor experiência de jogos virtual",

    // Depósito
    depositTitle: "DEPOSITAR",
    depositMin: "O valor mínimo de depósito é 10 MT",
    depositMax: "Valor máximo é 25.000 MT",
    invalidPhone: "Número inválido. Use 9 dígitos (84/85/86/87).",
    processing: "A PROCESSAR...",
    depositSuccess: "Depósito iniciado com sucesso!",
    depositError: "Erro ao processar depósito",
    depositInfo: "Após clicar em Depositar, aguarde a notificação no seu celular e confirme o pagamento inserindo seu PIN.",
    withdraw: "Sacar",
    withdrawComingSoon: "Função de saque em breve!",

    // Jogos
    allGames: "Todos os Jogos",
    casino: "Casino",
    popular: "Popular",
    games: "Jogos",
    viewAll: "Ver Todos",
    demoMode: "DEMO",
    realMode: "REAL",
    playNow: "Jogar Agora",
    betAmount: "Valor da aposta",
    placeBet: "Apostar",
    cashOut: "Retirar",

    // Perfil
    profile: "Perfil",
    balance: "Saldo",
    history: "Histórico",
    logout: "Sair",
    phoneNumber: "Número de telefone",
    memberSince: "Membro desde",

    // Bônus
    firstDepositBonus: "BÔNUS 500%",
    firstDepositBonusDesc: "No seu primeiro depósito!",
    bonusActive: "Bônus ativo",

    // Suporte
    support: "Suporte",
    supportTitle: "Como posso ajudar?",
    typeMessage: "Escreva sua mensagem...",
    send: "Enviar",

    // Chat
    globalChat: "Chat Global",
    typeHere: "Escreva aqui...",

    // Footer
    allRightsReserved: "Todos os direitos reservados",
    termsConditions: "Termos & Condições",
    privacyPolicy: "Política de Privacidade",
    responsibleGaming: "Jogo Responsável",
    licensedSecure: "Licenciado e Seguro",
    supportContact: "Suporte e Contacto",
    liveChat: "Chat ao Vivo 24/7",
    helpCenter: "Centro de Ajuda",
    security: "Segurança",
    entertainment: "A plataforma de entretenimento mais completa de Moçambique. Diversão garantida com os melhores slots, crash games e apostas exclusivas.",

    // 404
    pageNotFound: "Página não encontrada",
    goHome: "Voltar ao Início",
  },

  en: {
    // General
    brand: "MOZBET",
    slogan: "The best online gaming experience",
    loading: "Loading...",
    loadingGame: "Loading game...",
    close: "Close",
    back: "Back",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    error: "Error",
    success: "Success",

    // Header
    enter: "Login",
    register: "Register",
    deposit: "Deposit",
    currency: "MZN",

    // Auth
    createAccount: "Create Account",
    welcomeBack: "Welcome back",
    joinPlayers: "Join thousands of players and start winning today",
    enterAccount: "Sign in to your account to continue",
    phone: "Phone Number",
    password: "Password",
    alreadyHaveAccount: "Already have an account?",
    dontHaveAccount: "Don't have an account?",
    phoneMustBe9: "Phone number must be exactly 9 digits",
    invalidPrefix: "Number must start with",
    passwordMin: "Password must be at least 4 characters",
    phoneExists: "This number is already registered. Please login.",
    wrongCredentials: "Wrong number or password.",
    accountNotFound: "Account not found. Register first.",
    unexpectedError: "Unexpected error. Try again.",
    loginRequired: "Login is required to play for real money.",
    bestExperience: "The best virtual gaming experience",

    // Deposit
    depositTitle: "DEPOSIT",
    depositMin: "Minimum deposit amount is 10 MT",
    depositMax: "Maximum amount is 25,000 MT",
    invalidPhone: "Invalid number. Use 9 digits (84/85/86/87).",
    processing: "PROCESSING...",
    depositSuccess: "Deposit initiated successfully!",
    depositError: "Error processing deposit",
    depositInfo: "After clicking Deposit, wait for the notification on your phone and confirm the payment by entering your PIN.",
    withdraw: "Withdraw",
    withdrawComingSoon: "Withdrawal feature coming soon!",

    // Games
    allGames: "All Games",
    casino: "Casino",
    popular: "Popular",
    games: "Games",
    viewAll: "View All",
    demoMode: "DEMO",
    realMode: "REAL",
    playNow: "Play Now",
    betAmount: "Bet amount",
    placeBet: "Place Bet",
    cashOut: "Cash Out",

    // Profile
    profile: "Profile",
    balance: "Balance",
    history: "History",
    logout: "Logout",
    phoneNumber: "Phone number",
    memberSince: "Member since",

    // Bonus
    firstDepositBonus: "500% BONUS",
    firstDepositBonusDesc: "On your first deposit!",
    bonusActive: "Bonus active",

    // Support
    support: "Support",
    supportTitle: "How can I help?",
    typeMessage: "Type your message...",
    send: "Send",

    // Chat
    globalChat: "Global Chat",
    typeHere: "Type here...",

    // Footer
    allRightsReserved: "All rights reserved",
    termsConditions: "Terms & Conditions",
    privacyPolicy: "Privacy Policy",
    responsibleGaming: "Responsible Gaming",
    licensedSecure: "Licensed and Secure",
    supportContact: "Support & Contact",
    liveChat: "Live Chat 24/7",
    helpCenter: "Help Center",
    security: "Security",
    entertainment: "Mozambique's most complete entertainment platform. Guaranteed fun with the best slots, crash games and exclusive bets.",

    // 404
    pageNotFound: "Page not found",
    goHome: "Go Home",
  },
} as const;

export type TranslationKey = keyof typeof translations.pt;
