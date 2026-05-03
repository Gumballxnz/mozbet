/**
 * Utilitário para reprodução de efeitos sonoros
 */
// Cache para evitar recarregar o arquivo a cada execução
const audioCache: Record<string, HTMLAudioElement> = {};

export const playSound = (soundName: 'error' | 'notification' | 'win' | 'cashout' | 'crash' | 'click' | 'engine') => {
  if (typeof window === 'undefined') return;
  
  try {
    if (!audioCache[soundName]) {
      audioCache[soundName] = new Audio(`/sounds/${soundName}.mp3`);
      audioCache[soundName].preload = 'auto';
    }
    
    const audio = audioCache[soundName];
    
    // Resetar para o início caso já esteja tocando (permite cliques rápidos)
    audio.currentTime = 0;
    audio.volume = 0.5;
    
    audio.play().catch(err => {
      // Navegadores bloqueiam áudio automático sem interação prévia
      console.warn(`Áudio [${soundName}] bloqueado pelo navegador:`, err);
    });
  } catch (e) {
    console.error("Erro ao reproduzir som:", e);
  }
};

let bgMusic: HTMLAudioElement | null = null;

export const startBgMusic = () => {
  if (typeof window === 'undefined') return;
  
  if (!bgMusic) {
    bgMusic = new Audio('/sounds/bg.mp3');
    bgMusic.loop = true;
    bgMusic.volume = 0.4; // Volume ajustado para melhor imersão
  }
  
  bgMusic.play().catch(err => {
    console.warn("Música de fundo bloqueada:", err);
  });
};

export const stopBgMusic = () => {
  if (bgMusic) {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }
};
