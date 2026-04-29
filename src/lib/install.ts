export type InstallState = 'unsupported' | 'unknown' | 'added' | 'missed';
export type PromptResult = 'added' | 'dismissed' | 'unsupported';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPwaPrompt: BeforeInstallPromptEvent | null = null;

export function captureBeforeInstallPrompt(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e as BeforeInstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    deferredPwaPrompt = null;
  });
}

export function installState(): Promise<InstallState> {
  if (typeof window === 'undefined') return Promise.resolve('unsupported');

  const tg = window.Telegram?.WebApp;
  if (tg?.checkHomeScreenStatus) {
    return new Promise<InstallState>((resolve) => {
      tg.checkHomeScreenStatus?.((status: string) => {
        if (status === 'added') resolve('added');
        else if (status === 'missed') resolve('missed');
        else if (status === 'unsupported') resolve('unsupported');
        else resolve('unknown');
      });
    });
  }

  if (window.matchMedia?.('(display-mode: standalone)').matches) {
    return Promise.resolve('added');
  }
  if (deferredPwaPrompt !== null) return Promise.resolve('missed');
  return Promise.resolve('unknown');
}

export async function promptInstall(): Promise<PromptResult> {
  if (typeof window === 'undefined') return 'unsupported';

  const tg = window.Telegram?.WebApp;
  if (tg?.addToHomeScreen) {
    tg.addToHomeScreen();
    return 'added';
  }

  if (deferredPwaPrompt !== null) {
    const evt = deferredPwaPrompt;
    deferredPwaPrompt = null;
    await evt.prompt();
    const choice = await evt.userChoice;
    return choice.outcome === 'accepted' ? 'added' : 'dismissed';
  }

  return 'unsupported';
}
