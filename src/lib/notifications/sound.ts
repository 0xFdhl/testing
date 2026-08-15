let audioContext: AudioContext | null = null;
let unlocked = false;

/** Panggil saat interaksi pengguna pertama (pointerdown/keydown) untuk membuka kunci audio. */
export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
      unlocked = true;
    }
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }
  } catch {
    // AudioContext tidak tersedia — sound tetap nonaktif
  }
}

/**
 * Putar sound notifikasi. Menghormati autoplay policy: jika audio belum
 * dibuka kunci oleh interaksi pengguna, sound dilewati diam-diam (fallback aman).
 */
export function playNotificationSound(sound: string | null): void {
  if (!sound || typeof window === "undefined") return;
  if (!unlocked) return;
  try {
    const audio = new Audio(`/sounds/${sound}`);
    void audio.play().catch(() => {
      // fallback senyap — playback diblokir browser
    });
  } catch {
    // fallback senyap
  }
}