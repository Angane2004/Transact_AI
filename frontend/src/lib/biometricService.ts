import { Capacitor } from '@capacitor/core';

declare global {
  interface Window {
    plugins?: any;
  }
}

export class BiometricService {
  static async isAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      // Fallback to WebAuthn for web
      return !!(window.PublicKeyCredential && 
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false));
    }

    try {
      if (window.plugins?.fingerPrint?.isAvailable) {
        const result = await window.plugins.fingerPrint.isAvailable();
        return result.isAvailable;
      }
      return true;
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return false;
    }
  }

  static async authenticate(reason: string = 'Authenticate to continue'): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        // For web, we try to get an existing credential
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge,
            rpId: window.location.hostname,
            userVerification: "required",
            timeout: 60000,
          }
        });

        return !!credential;
      } catch (error: any) {
        if (error.name === 'NotAllowedError') {
          console.log('User cancelled biometric prompt');
          return false;
        }
        console.error('WebAuthn authentication failed:', error);
        throw new Error('Biometric authentication failed');
      }
    }

    try {
      if (window.plugins?.fingerPrint?.show) {
        const result = await window.plugins.fingerPrint.show({
          clientId: 'transactai-app',
          clientSecret: 'transactai-biometric-secret',
          disableBackup: false,
          localizedFallbackTitle: 'Use PIN',
          localizedReason: reason,
        });
        
        return result.withFingerprint || result.withBackup;
      }
      throw new Error('Biometric authentication not available');
    } catch (error: any) {
      console.error('Native biometric authentication failed:', error);
      throw new Error(error.message || 'Biometric authentication failed');
    }
  }

  static async enroll(reason: string = 'Enable biometric authentication'): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        // Create new WebAuthn credential for enrollment
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: {
              name: "TransactAI",
              id: window.location.hostname,
            },
            user: {
              id: userId,
              name: "user@transactai.app",
              displayName: "TransactAI User",
            },
            pubKeyCredParams: [
              { type: "public-key", alg: -7 }, // ES256
              { type: "public-key", alg: -257 }, // RS256
            ],
            authenticatorSelection: {
              userVerification: "required",
              residentKey: "preferred",
            },
            timeout: 60000,
            attestation: "none",
          }
        });

        return !!credential;
      } catch (error: any) {
        if (error.name === 'NotAllowedError') {
          console.log('User cancelled enrollment');
          return false;
        }
        console.error('WebAuthn enrollment failed:', error);
        throw new Error('Biometric enrollment failed');
      }
    }

    try {
      if (window.plugins?.fingerPrint?.show) {
        const result = await window.plugins.fingerPrint.show({
          clientId: 'transactai-app',
          clientSecret: 'transactai-biometric-secret',
          disableBackup: false,
          localizedFallbackTitle: 'Use PIN',
          localizedReason: reason,
        });
        
        return result.withFingerprint || result.withBackup;
      }
      throw new Error('Biometric enrollment not available');
    } catch (error: any) {
      console.error('Biometric enrollment failed:', error);
      throw new Error(error.message || 'Biometric enrollment failed');
    }
  }
}
