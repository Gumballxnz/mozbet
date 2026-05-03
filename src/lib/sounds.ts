/**
 * Utilitário para reprodução de efeitos sonoros
 */
export const playSound = (soundName: 'error' | 'notification' | 'win' | 'cashout' | 'crash' | 'click' | 'engine') => {
  if (typeof window === 'undefined') return;
  
  try {
    const audio = new Audio(`/sounds/${soundName}.mp3`);
    audio.volume = 0.5;
    audio.play().catch(err => {
      // Navegadores bloqueiam áudio automático sem interação prévia
      console.warn("Áudio bloqueado pelo navegador:", err);
    });
  } catch (e) {
    console.error("Erro ao reproduzir som:", e);
  }
};
