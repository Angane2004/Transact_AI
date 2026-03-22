"use client";

import { useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { authService, transactionService, type Transaction } from '@/lib/localStorageService';
import { firestoreService } from '@/lib/firestoreService';

export function useSmsListener(onTransactionAdded: () => void) {
  useEffect(() => {
    // Dispatched from MainActivity.java (Capacitor) when SMS_RECEIVED fires
    const handleSmsEvent = async (event: Event) => {
      try {
        const raw = (event as CustomEvent).detail;
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const { message, sender } = data;

        console.log("📨 SMS received:", message?.slice?.(0, 80), "from:", sender);

        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, '').trim();
        if (!userId) {
          toast.warning('Sign in so real-time SMS can be saved to your account.');
          return;
        }

        toast.promise(
            (async () => {
                const res = await api.post("/classify", { message }, { timeout: 120000 });
                const result = res.data;

                if (result.status === "saved" || result.status === "low_confidence") {
                    const isLow = result.status === "low_confidence";
                    const txnId = result.id ? String(result.id) : `txn_${Date.now()}`;
                    const amount = typeof result.amount === "number" ? result.amount : 0;
                    const receiver = result.receiver || sender || "Unknown";

                    const localTxn: Transaction = {
                      id: txnId,
                      description: message,
                      amount,
                      category: result.category,
                      date: new Date().toISOString(),
                      recipient: receiver,
                      type: (result.type as "debit" | "credit") || "debit",
                      status: isLow ? "pending" : "completed",
                      ai_explanation: result.ai_explanation,
                      ai_suggestions: result.ai_suggestions,
                    };
                    transactionService.save(localTxn, userId);

                    await firestoreService.saveTransaction(userId, {
                        id: txnId,
                        description: message,
                        amount,
                        category: result.category,
                        date: new Date().toISOString(),
                        receiver,
                        type: result.type || "debit",
                        status: isLow ? "pending" : "completed"
                    });

                    onTransactionAdded();
                    return result.status === "saved"
                        ? `Saved from ${sender || "SMS"}`
                        : `Saved (low confidence) from ${sender || "SMS"} — review or recategorize.`;
                }
                throw new Error("Unexpected classify response");
            })(),
            {
                loading: 'Processing SMS…',
                success: (msg) => msg,
                error: 'Could not classify this SMS (timeout or network).',
            }
        );

      } catch (error) {
        console.error("SMS bridge error:", error);
      }
    };

    window.addEventListener('onSmsReceived', handleSmsEvent);
    
    return () => {
      window.removeEventListener('onSmsReceived', handleSmsEvent);
    };
  }, [onTransactionAdded]);
}
