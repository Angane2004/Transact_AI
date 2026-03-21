// Comprehensive LocalStorage Service for TransactAI
// All data is stored locally - no Firebase or backend required

export interface UserProfile {
    phone: string;
    name?: string;
    fullName?: string;
    gender?: string;
    email?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Transaction {
    id: string;
    description: string;
    amount: number;
    category: string;
    date: string;
    recipient?: string;
    type?: 'debit' | 'credit';
    status?: "completed" | "pending" | "failed";
    
    // AI Agents fields
    is_anomaly?: boolean;
    anomaly_reason?: string;
    ai_explanation?: string;
    ai_suggestions?: string[];
}

export interface Category {
    name: string;
    createdAt: string;
}

// Helper to get user-specific storage key
const getUserKey = (baseKey: string, userId?: string): string => {
    if (userId) {
        return `${baseKey}_${userId}`;
    }
    // Try to get from session if not provided (only on client side)
    if (typeof window === 'undefined') {
        return baseKey;
    }
    try {
        const session = localStorage.getItem('transactai_auth_session');
        if (session) {
            const parsed = JSON.parse(session);
            const phone = parsed.phone?.replace(/\+/g, '') || 'default';
            return `${baseKey}_${phone}`;
        }
    } catch (e) {
        // Ignore
    }
    return baseKey;
};

export interface DownloadRecord {
    id: string;
    filename: string;
    format: 'csv' | 'json' | 'xlsx';
    fileSize: number;
    fileContent: string;
    mimeType: string;
    downloadDate: string;
    transactionCount: number;
    period?: string;
}

const STORAGE_KEYS = {
    USER_PROFILE: 'transactai_user_profile',
    TRANSACTIONS: 'transactai_transactions',
    CATEGORIES: 'transactai_categories',
    PIN: 'transactai_pin',
    AUTH_SESSION: 'transactai_auth_session',
    ONBOARDING_COMPLETE: 'transactai_onboarding_complete',
    DOWNLOADS: 'transactai_downloads',
    BIOMETRICS: 'transactai_biometrics',
};

// User Profile Operations
export const userService = {
    saveProfile(profile: UserProfile, userId?: string): void {
        if (typeof window === 'undefined') return;
        const data = {
            ...profile,
            updatedAt: new Date().toISOString(),
        };
        const key = getUserKey(STORAGE_KEYS.USER_PROFILE, userId || profile.phone?.replace(/\+/g, ''));
        localStorage.setItem(key, JSON.stringify(data));
    },

    getProfile(userId?: string): UserProfile | null {
        if (typeof window === 'undefined') return null;
        const key = getUserKey(STORAGE_KEYS.USER_PROFILE, userId);
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    updateProfile(updates: Partial<UserProfile>, userId?: string): void {
        const current = this.getProfile(userId);
        if (current) {
            this.saveProfile({ ...current, ...updates }, userId);
        }
    },
};

// Transaction Operations
export const transactionService = {
    getAll(userId?: string): Transaction[] {
        if (typeof window === 'undefined') return [];
        const key = getUserKey(STORAGE_KEYS.TRANSACTIONS, userId);
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    },

    save(transaction: Transaction, userId?: string): void {
        if (typeof window === 'undefined') return;
        const transactions = this.getAll(userId);
        transactions.push(transaction);
        const key = getUserKey(STORAGE_KEYS.TRANSACTIONS, userId);
        localStorage.setItem(key, JSON.stringify(transactions));
    },

    saveMany(transactions: Transaction[], userId?: string): void {
        if (typeof window === 'undefined') return;
        const key = getUserKey(STORAGE_KEYS.TRANSACTIONS, userId);
        localStorage.setItem(key, JSON.stringify(transactions));
    },

    update(id: string, updates: Partial<Transaction>, userId?: string): void {
        if (typeof window === 'undefined') return;
        const transactions = this.getAll(userId);
        const index = transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            transactions[index] = { ...transactions[index], ...updates };
            const key = getUserKey(STORAGE_KEYS.TRANSACTIONS, userId);
            localStorage.setItem(key, JSON.stringify(transactions));
        }
    },

    delete(id: string, userId?: string): void {
        if (typeof window === 'undefined') return;
        const transactions = this.getAll(userId);
        const filtered = transactions.filter(t => t.id !== id);
        const key = getUserKey(STORAGE_KEYS.TRANSACTIONS, userId);
        localStorage.setItem(key, JSON.stringify(filtered));
    },

    getByCategory(category: string, userId?: string): Transaction[] {
        return this.getAll(userId).filter(t => t.category === category);
    },

    getByDateRange(startDate: string, endDate: string, userId?: string): Transaction[] {
        return this.getAll(userId).filter(t => {
            const date = new Date(t.date);
            return date >= new Date(startDate) && date <= new Date(endDate);
        });
    },
};

// Category Operations
export const categoryService = {
    getAll(userId?: string): Category[] {
        if (typeof window === 'undefined') return [];
        const key = getUserKey(STORAGE_KEYS.CATEGORIES, userId);
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    },

    add(categoryName: string, userId?: string): void {
        if (typeof window === 'undefined') return;
        const categories = this.getAll(userId);
        if (!categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase())) {
            categories.push({
                name: categoryName,
                createdAt: new Date().toISOString(),
            });
            const key = getUserKey(STORAGE_KEYS.CATEGORIES, userId);
            localStorage.setItem(key, JSON.stringify(categories));
        }
    },

    remove(categoryName: string, userId?: string): void {
        if (typeof window === 'undefined') return;
        const categories = this.getAll(userId);
        const filtered = categories.filter(c => c.name !== categoryName);
        const key = getUserKey(STORAGE_KEYS.CATEGORIES, userId);
        localStorage.setItem(key, JSON.stringify(filtered));
    },

    getNames(userId?: string): string[] {
        return this.getAll(userId).map(c => c.name);
    },
};

// PIN Operations (per user)
export const pinService = {
    save(pin: string, userId?: string): void {
        if (typeof window === 'undefined') return;
        const key = userId ? `${STORAGE_KEYS.PIN}_${userId}` : STORAGE_KEYS.PIN;
        localStorage.setItem(key, pin);
    },

    verify(pin: string, userId?: string): boolean {
        if (typeof window === 'undefined') return false;
        const key = userId ? `${STORAGE_KEYS.PIN}_${userId}` : STORAGE_KEYS.PIN;
        const savedPin = localStorage.getItem(key);
        return savedPin === pin;
    },

    exists(userId?: string): boolean {
        if (typeof window === 'undefined') return false;
        const key = userId ? `${STORAGE_KEYS.PIN}_${userId}` : STORAGE_KEYS.PIN;
        return !!localStorage.getItem(key);
    },

    remove(userId?: string): void {
        if (typeof window === 'undefined') return;
        const key = userId ? `${STORAGE_KEYS.PIN}_${userId}` : STORAGE_KEYS.PIN;
        localStorage.removeItem(key);
    },

    get(userId?: string): string | null {
        if (typeof window === 'undefined') return null;
        const key = userId ? `${STORAGE_KEYS.PIN}_${userId}` : STORAGE_KEYS.PIN;
        return localStorage.getItem(key);
    },
};

// Biometric Operations (per user)
export interface BiometricConfig {
    enabled: boolean;
    type: 'face' | 'fingerprint' | 'both';
    credentialId?: string;
    updatedAt: string;
}

export const biometricService = {
    save(config: BiometricConfig, userId?: string): void {
        if (typeof window === 'undefined') return;
        const key = getUserKey(STORAGE_KEYS.BIOMETRICS, userId);
        localStorage.setItem(key, JSON.stringify(config));
    },

    get(userId?: string): BiometricConfig | null {
        if (typeof window === 'undefined') return null;
        const key = getUserKey(STORAGE_KEYS.BIOMETRICS, userId);
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    isEnabled(userId?: string): boolean {
        const config = this.get(userId);
        return !!config?.enabled;
    },

    disable(userId?: string): void {
        const config = this.get(userId);
        if (config) {
            this.save({ ...config, enabled: false, updatedAt: new Date().toISOString() }, userId);
        }
    },

    remove(userId?: string): void {
        if (typeof window === 'undefined') return;
        const key = getUserKey(STORAGE_KEYS.BIOMETRICS, userId);
        localStorage.removeItem(key);
    }
};

// Auth Session Operations
import { getFirebaseAuth } from "./firebase";
import { signOut } from "firebase/auth";

export const authService = {
    saveSession(phone: string): void {
        if (typeof window === 'undefined') return;
        const session = {
            phone,
            timestamp: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
    },

    getSession(): { phone: string; timestamp: string } | null {
        if (typeof window === 'undefined') return null;
        const data = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
        return data ? JSON.parse(data) : null;
    },

    async clearSession(): Promise<void> {
        if (typeof window === 'undefined') return;
        const session = this.getSession();
        if (session) {
            // Clear user-specific unlock flag
            const phone = session.phone.replace(/\+/g, "");
            const unlockKey = `app_unlocked_${phone}`;
            sessionStorage.removeItem(unlockKey);
        }
        localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);

        // Sign out from Firebase if auth is initialized
        try {
            const auth = getFirebaseAuth();
            if (auth) {
                await signOut(auth);
                console.log("✅ Signed out from Firebase");
            }
        } catch (error) {
            console.error("Error signing out from Firebase:", error);
        }
    },
};

// Onboarding Operations
export const onboardingService = {
    markComplete(): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
    },

    isComplete(): boolean {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE) === 'true';
    },

    reset(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    },
};

// Generate Simulated Transaction Data
export const generateSimulatedTransactions = (count: number = 50): Transaction[] => {
    const categories = [
        'Food & Dining', 'Shopping', 'Transportation', 'Bills & Utilities',
        'Entertainment', 'Healthcare', 'Education', 'Travel', 'Groceries',
        'Personal Care', 'Gifts', 'Insurance', 'Investment', 'Savings'
    ];

    const descriptions = [
        'Payment to', 'Transfer to', 'Purchase at', 'Bill payment for',
        'Subscription for', 'Refund from', 'Cashback from', 'Payment received from'
    ];

    const merchants = [
        'Amazon', 'Flipkart', 'Swiggy', 'Zomato', 'Uber', 'Ola', 'Paytm',
        'PhonePe', 'Google Pay', 'Netflix', 'Spotify', 'Prime Video',
        'BigBasket', 'DMart', 'Reliance', 'Tata', 'ICICI Bank', 'HDFC Bank'
    ];

    const transactions: Transaction[] = [];
    const now = new Date();

    // Define specific transactions template (will be randomly distributed)
    const specificTransactionsTemplate: Array<{
        description: string;
        amount: number;
        category: string;
        recipient: string;
        type: 'debit' | 'credit';
    }> = [
        {
            description: '₹4331 for Netflix',
            amount: 4331,
            category: 'Entertainment',
            recipient: 'Netflix',
            type: 'debit',
        },
        {
            description: '₹2389 for Ravi Contractor',
            amount: 2389,
            category: 'Bills & Utilities',
            recipient: 'Ravi Contractor',
            type: 'debit',
        },
        {
            description: '₹4301 paid at Amazon via Google Pay',
            amount: 4301,
            category: 'Shopping',
            recipient: 'Amazon',
            type: 'debit',
        },
        {
            description: '₹4406 received from Netmeds',
            amount: 4406,
            category: 'Healthcare',
            recipient: 'Netmeds',
            type: 'credit',
        },
        {
            description: '₹3683 paid using UPI to Myntra',
            amount: 3683,
            category: 'Shopping',
            recipient: 'Myntra',
            type: 'debit',
        },
        {
            description: '₹3980 received from Dominos',
            amount: 3980,
            category: 'Food & Dining',
            recipient: 'Dominos',
            type: 'credit',
        },
        {
            description: '₹2768 paid using UPI to Big Bazaar',
            amount: 2768,
            category: 'Groceries',
            recipient: 'Big Bazaar',
            type: 'debit',
        },
        {
            description: '₹2518 paid using UPI to HP Petrol Pump',
            amount: 2518,
            category: 'Transportation',
            recipient: 'HP Petrol Pump',
            type: 'debit',
        },
        {
            description: '₹4789 debited for purchase at Harsh',
            amount: 4789,
            category: 'Shopping',
            recipient: 'Harsh',
            type: 'debit',
        },
        {
            description: '₹1319 charged at Rapido',
            amount: 1319,
            category: 'Transportation',
            recipient: 'Rapido',
            type: 'debit',
        },
    ];

    // Generate all random transactions first
    for (let i = 0; i < count; i++) {
        const daysAgo = Math.floor(Math.random() * 90); // Last 90 days
        const date = new Date(now);
        date.setDate(date.getDate() - daysAgo);
        date.setHours(Math.floor(Math.random() * 24));
        date.setMinutes(Math.floor(Math.random() * 60));

        const category = categories[Math.floor(Math.random() * categories.length)];
        const description = descriptions[Math.floor(Math.random() * descriptions.length)];
        const merchant = merchants[Math.floor(Math.random() * merchants.length)];
        const amount = Math.floor(Math.random() * 50000) + 100; // ₹100 to ₹50,000

        transactions.push({
            id: `txn_${Date.now()}_${i}`,
            description: `${description} ${merchant}`,
            amount,
            category,
            date: date.toISOString(),
            recipient: merchant,
            type: Math.random() > 0.1 ? 'debit' : 'credit',
        });
    }

    // Randomly replace some transactions with specific ones
    // Randomly select how many specific transactions to include (between 5-10)
    const numSpecificToInclude = Math.floor(Math.random() * 6) + 5; // 5 to 10
    const shuffledSpecific = [...specificTransactionsTemplate].sort(() => Math.random() - 0.5);
    const selectedSpecific = shuffledSpecific.slice(0, numSpecificToInclude);

    // Randomly replace transactions with specific ones
    const indicesToReplace = new Set<number>();
    while (indicesToReplace.size < selectedSpecific.length && indicesToReplace.size < transactions.length) {
        indicesToReplace.add(Math.floor(Math.random() * transactions.length));
    }

    let specificIndex = 0;
    indicesToReplace.forEach((index) => {
        if (specificIndex < selectedSpecific.length) {
            const specific = selectedSpecific[specificIndex];
            const daysAgo = Math.floor(Math.random() * 90); // Random date within last 90 days
            const date = new Date(now);
            date.setDate(date.getDate() - daysAgo);
            date.setHours(Math.floor(Math.random() * 24));
            date.setMinutes(Math.floor(Math.random() * 60));

            transactions[index] = {
                id: `txn_specific_${Date.now()}_${specificIndex}`,
                description: specific.description,
                amount: specific.amount,
                category: specific.category,
                date: date.toISOString(),
                recipient: specific.recipient,
                type: specific.type,
            };
            specificIndex++;
        }
    });

    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return transactions;
};

// Download Operations
export const downloadService = {
    save(download: DownloadRecord, userId?: string): void {
        if (typeof window === 'undefined') return;
        const downloads = this.getAll(userId);
        downloads.unshift(download); // Add to beginning
        // Keep only last 50 downloads
        const limited = downloads.slice(0, 50);
        const key = getUserKey(STORAGE_KEYS.DOWNLOADS, userId);
        localStorage.setItem(key, JSON.stringify(limited));
    },

    getAll(userId?: string): DownloadRecord[] {
        if (typeof window === 'undefined') return [];
        const key = getUserKey(STORAGE_KEYS.DOWNLOADS, userId);
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    },

    delete(id: string, userId?: string): void {
        if (typeof window === 'undefined') return;
        const downloads = this.getAll(userId);
        const filtered = downloads.filter(d => d.id !== id);
        const key = getUserKey(STORAGE_KEYS.DOWNLOADS, userId);
        localStorage.setItem(key, JSON.stringify(filtered));
    },

    clear(userId?: string): void {
        if (typeof window === 'undefined') return;
        const key = getUserKey(STORAGE_KEYS.DOWNLOADS, userId);
        localStorage.removeItem(key);
    },
};

// Initialize with simulated data if no data exists (per user)
export const initializeData = (userId?: string) => {
    if (typeof window === 'undefined') return;
    if (transactionService.getAll(userId).length === 0) {
        const simulated = generateSimulatedTransactions(50);
        transactionService.saveMany(simulated, userId);
    }

    // Add default categories if none exist
    if (categoryService.getAll(userId).length === 0) {
        const defaultCategories = [
            'Food & Dining', 'Shopping', 'Transportation', 'Bills & Utilities',
            'Entertainment', 'Healthcare', 'Education', 'Travel', 'Groceries'
        ];
        defaultCategories.forEach(cat => categoryService.add(cat, userId));
    }
};

