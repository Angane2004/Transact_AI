"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { transactionService, authService, Transaction } from "@/lib/localStorageService";
import { api, endpoints } from "@/lib/api";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
    "How much did I spend on Food this month?",
    "What is my largest transaction recently?",
    "Am I spending too much on Shopping?",
    "Summarize my recent expenses."
];

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([{
        id: "welcome",
        role: "assistant",
        content: "Hi! I'm your TransactAI Finance Assistant. Ask me anything about your spending, trends, or specific transactions. How can I help you today?",
        timestamp: new Date()
    }]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        // Load recent transactions for context
        const session = authService.getSession();
        const userId = session?.phone.replace(/\+/g, '');
        const allTransactions = transactionService.getAll(userId);
        // Take the latest 100 for context to avoid overloading prompt
        setTransactions(allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 100));
        scrollToBottom();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSend = async (text: string) => {
        if (!text.trim()) return;

        const newUserMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: text.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newUserMessage]);
        setInputValue("");
        setIsLoading(true);

        try {
            // Real API Call
            const payload = {
                query: newUserMessage.content,
                context: transactions.map(t => ({
                    date: t.date,
                    amount: t.amount,
                    merchant: t.recipient || "Unknown",
                    category: t.category,
                    type: t.type || "debit"
                }))
            };

            const response = await api.post('/chat', payload);
            
            if (response.data?.status === "success") {
                const newBotMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: response.data.response,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, newBotMessage]);
            } else {
                throw new Error("Failed to get response");
            }
        } catch (error: any) {
            console.error("Chat error:", error);
            
            // Fallback mock if backend is down or Gemini not configured
            const isServiceUnavailable = error.response?.status === 503;
            const errMsg = isServiceUnavailable 
                ? "The AI agent is currently disabled (API key might be missing)." 
                : "Sorry, I had trouble processing your request.";
            
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: `⚠️ ${errMsg} I am a mock response since the backend didn't reply successfully. You asked: "${newUserMessage.content}"`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
            
            if (!isServiceUnavailable) {
                 toast.error("Failed to connect to AI Service.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col p-4 md:p-8 pt-6 h-[calc(100vh-4rem)]">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex justify-between items-end"
            >
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                        Ask AI <Sparkles className="h-6 w-6 text-blue-500" />
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Chat with your personal finance advisor
                    </p>
                </div>
            </motion.div>

            <Card className="flex-1 flex flex-col overflow-hidden shadow-lg border-muted/60">
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    <AnimatePresence initial={false}>
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div className={`flex gap-3 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                    <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"}`}>
                                        {message.role === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                                    </div>
                                    <div className={`p-4 rounded-2xl ${
                                        message.role === "user" 
                                        ? "bg-primary text-primary-foreground rounded-tr-sm" 
                                        : "bg-muted/60 border rounded-tl-sm text-foreground"
                                    }`}>
                                        {message.role === "user" ? (
                                            <p className="whitespace-pre-wrap">{message.content}</p>
                                        ) : (
                                            <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 max-w-none">
                                                <ReactMarkdown>{message.content}</ReactMarkdown>
                                            </div>
                                        )}
                                        <div className={`text-[10px] mt-2 opacity-60 ${message.role === "user" ? "text-right" : "text-left"}`}>
                                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {isLoading && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="flex gap-3">
                                <div className="shrink-0 h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                    <Bot className="h-5 w-5" />
                                </div>
                                <div className="p-4 rounded-2xl bg-muted/60 border rounded-tl-sm flex items-center h-[52px]">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-background border-t">
                    {messages.length === 1 && (
                        <div className="flex flex-wrap gap-2 mb-4 justify-center">
                            {SUGGESTED_QUESTIONS.map((q, i) => (
                                <Button
                                    key={i}
                                    variant="outline"
                                    className="rounded-full text-xs font-normal border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                    onClick={() => handleSend(q)}
                                >
                                    {q}
                                </Button>
                            ))}
                        </div>
                    )}
                    <form 
                        onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }}
                        className="flex gap-2 relative max-w-4xl mx-auto"
                    >
                        <Input
                            placeholder="Ask about your finances..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            disabled={isLoading}
                            className="flex-1 rounded-full px-6 bg-muted/50 border-muted focus-visible:ring-primary h-12"
                        />
                        <Button 
                            type="submit" 
                            disabled={!inputValue.trim() || isLoading}
                            className="rounded-full h-12 w-12 shrink-0 transition-all"
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    </form>
                    <div className="text-center text-xs text-muted-foreground mt-2 opacity-50">
                        Ask AI may occasionally produce inaccurate information.
                    </div>
                </div>
            </Card>
        </div>
    );
}
