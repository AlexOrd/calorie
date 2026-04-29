import { storage } from '$lib/storage';
import type { TelegramBiometricManager } from '$types/telegram';

export type BiometricSupport = 'telegram' | 'webauthn' | 'unsupported';

const CRED_KEY = 'biometric_credential_id';

function getTelegramBio(): TelegramBiometricManager | null {
  return window.Telegram?.WebApp?.BiometricManager ?? null;
}

async function ensureTelegramInited(bio: TelegramBiometricManager): Promise<void> {
  if (bio.isInited) return;
  await new Promise<void>((resolve) => {
    bio.init(() => resolve());
  });
}

async function isWebAuthnSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !('credentials' in navigator)) return false;
  if (typeof PublicKeyCredential === 'undefined') return false;
  try {
    const ok = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return Boolean(ok);
  } catch {
    return false;
  }
}

export async function biometricSupport(): Promise<BiometricSupport> {
  if (typeof window === 'undefined') return 'unsupported';
  const tgBio = getTelegramBio();
  if (tgBio) {
    await ensureTelegramInited(tgBio);
    if (tgBio.isBiometricAvailable) return 'telegram';
  }
  if (await isWebAuthnSupported()) return 'webauthn';
  return 'unsupported';
}

function randomChallenge(): ArrayBuffer {
  const buf = new ArrayBuffer(32);
  crypto.getRandomValues(new Uint8Array(buf));
  return buf;
}

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i] ?? 0);
  return btoa(str);
}

function base64ToBuf(s: string): ArrayBuffer {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export async function enrol(): Promise<boolean> {
  const support = await biometricSupport();
  if (support === 'telegram') {
    const bio = getTelegramBio();
    if (!bio) return false;
    return await new Promise<boolean>((resolve) => {
      bio.requestAccess({ reason: 'Захист додатку' }, (granted) => {
        if (!granted) {
          resolve(false);
          return;
        }
        bio.updateBiometricToken('1', (saved) => resolve(saved));
      });
    });
  }
  if (support === 'webauthn') {
    try {
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge: randomChallenge(),
          rp: { name: 'Calorie' },
          user: {
            id: randomChallenge(),
            name: 'calorie-user',
            displayName: 'Calorie User',
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      });
      if (!(cred instanceof PublicKeyCredential)) return false;
      const credentialId = bufToBase64(cred.rawId);
      await storage.save(CRED_KEY, credentialId);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function verify(): Promise<boolean> {
  const support = await biometricSupport();
  if (support === 'telegram') {
    const bio = getTelegramBio();
    if (!bio) return false;
    return await new Promise<boolean>((resolve) => {
      bio.authenticate({ reason: 'Розблокувати' }, (success) => resolve(success));
    });
  }
  if (support === 'webauthn') {
    const credId = await storage.load<string | null>(CRED_KEY, null);
    if (credId === null) return false;
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: randomChallenge(),
          allowCredentials: [{ type: 'public-key', id: base64ToBuf(credId) }],
          userVerification: 'required',
          timeout: 60000,
        },
      });
      return assertion !== null;
    } catch {
      return false;
    }
  }
  return false;
}

export async function clearEnrolment(): Promise<void> {
  await storage.remove(CRED_KEY);
}
