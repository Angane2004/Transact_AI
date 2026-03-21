"use client";

import { useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { authService } from '@/lib/localStorageService';
import { firestoreService } from '@/lib/firestoreService';

export function useSmsListener(onTransactionAdded: () => void) {
  useEffect(() => {
    // This event is triggered from the Native Android side (MainActivity.java)
    const handleSmsEvent = async (event: any) => {
      try {
        // The native side sends a JSON string
        const data = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail;
        const { message, sender } = data;

        console.log("📨 Real-time SMS detectada:", message, "from:", sender);
        
        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, '').trim();
        if (!userId) return;

        toast.promise(
            (async () => {
                const res = await api.post("/classify", { message });
                const result = res.data;

                if (result.status === "saved" || result.status === "low_confidence") {
                    const isLow = result.status === "low_confidence";
                    
                    await firestoreService.saveTransaction(userId, {
                        id: `txn_${Date.now()}`,
                        description: message,
                        amount: result.amount || 0,
                        category: result.category,
                        date: new Date().toISOString(),
                        receiver: result.receiver || sender || "Unknown",
                        type: result.type || "debit",
                        status: isLow ? "pending" : "completed"
                    });
                    
                    onTransactionAdded();
                    return result.status === "saved" 
                        ? `Auto-saved transaction from ${sender}` 
                        : `Received transaction from ${sender}. Please categorize.`;
                }
                throw new Error("Not a transaction message");
            })(),
            {
                loading: 'Processing real-time SMS...',
                success: (msg) => msg,
                error: 'SMS detected but not a valid transaction.',
            }
        );

      } catch (error) {
        console.error("SMS Bridge Error:", error);
      }
    };

    window.addEventListener('onSmsReceived', handleSmsEvent);
    
    return () => {
      window.removeEventListener('onSmsReceived', handleSmsEvent);
    };
  }, [onTransactionAdded]);
}
