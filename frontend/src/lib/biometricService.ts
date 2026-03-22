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
      // Check if device has biometric capabilities
      if (window.plugins?.fingerPrint?.isAvailable) {
        const result = await window.plugins.fingerPrint.isAvailable();
        return result.isAvailable;
      }
      
      // Fallback check
      return true;
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return false;
    }
  }

  static async authenticate(reason: string = 'Authenticate to continue'): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      // WebAuthn fallback for web
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const credential = await navigator.credentials.get({
          publicKey: {
            challenge,
            rpId: window.location.hostname,
            userVerification: "required",
            timeout: 60000,
          }
        });

        return !!credential;
      } catch (error) {
        console.error('WebAuthn authentication failed:', error);
        throw new Error('Biometric authentication failed');
      }
    }

    try {
      // Native biometric authentication
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
      // For web, just check if biometrics are available
      return this.isAvailable();
    }

    try {
      // Native enrollment
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
