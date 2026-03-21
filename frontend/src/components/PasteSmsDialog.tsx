"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { api } from "@/lib/api";
import { authService, transactionService } from "@/lib/localStorageService";
import { firestoreService } from "@/lib/firestoreService";

interface PasteSmsDialogProps {
  onTransactionAdded: () => void;
}

export function PasteSmsDialog({ onTransactionAdded }: PasteSmsDialogProps) {
  const [open, setOpen] = useState(false);
  const [smsText, setSmsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);

  const handleParse = async () => {
    if (!smsText.trim()) {
      toast.error("Please paste an SMS message first");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/parse-sms", { message: smsText });
      setParsedData(response.data.parsed);
      toast.success("AI parsed the SMS successfully!");
    } catch (error) {
      console.error(error);
      toast.error("AI couldn't parse this message. Make sure GEMINI_API_KEY is set or local model is active.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    const session = authService.getSession();
    const userId = session?.phone.replace(/\+/g, '').trim();

    setLoading(true);
    try {
      const response = await api.post("/classify", { message: smsText });
      const data = response.data;
      
      if (data.status === "saved" || data.status === "low_confidence") {
        const category = data.status === "saved" ? data.category : data.category;
        const isLowConfidence = data.status === "low_confidence";
        
        toast.success(data.status === "saved" ? `Saved! Categorized as ${category}` : "Saved with low confidence. Please categorize.");
        
        // Sync to Firestore if available
        if (userId) {
            const txnId = `txn_${Date.now()}`;
            await firestoreService.saveTransaction(userId, {
                id: txnId,
                description: smsText,
                amount: data.amount || 0,
                category: category,
                date: new Date().toISOString(),
                receiver: data.receiver || "Unknown",
                type: data.type || "debit",
                status: isLowConfidence ? "pending" : "completed"
            });
        }

        onTransactionAdded();
        handleClose();
      }
    } catch (error) {
       console.error("Failed to save to cloud, falling back to local:", error);
       
       // Offline saving fallback
       if (parsedData) {
         const offlineTxn = {
           id: `offline_${Date.now()}`,
           description: smsText,
           amount: parsedData.amount || 0,
           category: parsedData.category || "Uncategorized",
           date: new Date().toISOString(),
           recipient: parsedData.merchant || "Unknown",
           type: parsedData.type || "debit",
           status: "pending" as const
         };
         
         transactionService.save(offlineTxn, userId);
         toast.info("Saved locally (offline mode). It will sync when cloud is back.");
         onTransactionAdded();
         handleClose();
       } else {
         toast.error("Failed to save transaction. Try again later.");
       }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSmsText("");
    setParsedData(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button 
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg border-0"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Add from SMS
      </Button>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            AI SMS Parser
          </DialogTitle>
          <DialogDescription>
            Paste your bank SMS or transaction notification below. Our AI will automatically extract details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            placeholder="e.g., Your a/c no. XX1234 is debited for Rs. 500.00 on 21-Mar-26 by info at Zomato..."
            className="min-h-[120px] text-sm md:text-base leading-relaxed"
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            disabled={loading || !!parsedData}
          />

          <AnimatePresence>
            {parsedData && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800 space-y-3"
              >
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  AI Extraction Result
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700/60 dark:text-blue-300/60 uppercase text-[10px] font-bold tracking-wider">Amount</p>
                    <p className="font-bold text-lg text-blue-900 dark:text-blue-100">
                      ₹{parsedData.amount?.toFixed(2) || "?.??"}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700/60 dark:text-blue-300/60 uppercase text-[10px] font-bold tracking-wider">Merchant</p>
                    <p className="font-bold text-lg text-blue-900 dark:text-blue-100 truncate">
                      {parsedData.merchant || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700/60 dark:text-blue-300/60 uppercase text-[10px] font-bold tracking-wider">Date</p>
                    <p className="text-blue-900 dark:text-blue-100 italic">
                      {parsedData.date || "Today"}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700/60 dark:text-blue-300/60 uppercase text-[10px] font-bold tracking-wider">Type</p>
                    <p className={`font-semibold capitalize ${parsedData.type === 'debit' ? 'text-red-500' : 'text-green-500'}`}>
                      {parsedData.type || "debit"}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {!parsedData ? (
             <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleParse}
                disabled={loading || !smsText.trim()}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Analyze SMS
              </Button>
          ) : (
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setParsedData(null)}
                disabled={loading}
              >
                Retry
              </Button>
              <Button
                className="flex-[2] bg-green-600 hover:bg-green-700"
                onClick={handleConfirm}
                disabled={loading}
              >
                 {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                 Confirm & Save
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
