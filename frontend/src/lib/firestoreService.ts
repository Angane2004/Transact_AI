import { app, isSimulationMode } from "./firebase";

// Initialize Firestore only if Firebase is available
let firestore: any = null;

if (!isSimulationMode && app && typeof window !== 'undefined') {
    try {
        const { getFirestore } = require("firebase/firestore");
        firestore = getFirestore(app);
    } catch (error) {
        console.warn("Firestore not available");
    }
}

// Re-export firestore functions with fallbacks
const getFirestoreFunctions = () => {
    if (isSimulationMode || !firestore) {
        return {
            doc: () => ({}),
            setDoc: async () => ({ success: false }),
            getDoc: async () => ({ exists: () => false }),
            updateDoc: async () => ({ success: false }),
            collection: () => ({}),
            query: () => ({}),
            where: () => ({}),
            getDocs: async () => ({ docs: [] }),
            deleteDoc: async () => ({ success: false }),
        };
    }
    const firestoreModule = require("firebase/firestore");
    return {
        doc: firestoreModule.doc,
        setDoc: firestoreModule.setDoc,
        getDoc: firestoreModule.getDoc,
        updateDoc: firestoreModule.updateDoc,
        collection: firestoreModule.collection,
        query: firestoreModule.query,
        where: firestoreModule.where,
        getDocs: firestoreModule.getDocs,
        deleteDoc: firestoreModule.deleteDoc,
        Timestamp: firestoreModule.Timestamp,
    };
};

const {
    doc: docFn,
    setDoc: setDocFn,
    getDoc: getDocFn,
    updateDoc: updateDocFn,
    collection: collectionFn,
    query: queryFn,
    where: whereFn,
    getDocs: getDocsFn,
    deleteDoc: deleteDocFn,
    Timestamp
} = getFirestoreFunctions();

export const firestoreService = {
    // User Profile Operations
    async saveUserProfile(userId: string, profileData: any) {
        if (isSimulationMode || !firestore) return { success: false };
        try {
            const userRef = docFn(firestore, "users", userId);
            await setDocFn(userRef, {
                profile: {
                    ...profileData,
                    updatedAt: Timestamp?.now() || new Date().toISOString(),
                }
            }, { merge: true });
            return { success: true };
        } catch (error) {
            console.error("❌ Firestore profile save error:", error);
            return { success: false, error };
        }
    },

    async getUserProfile(userId: string) {
        if (isSimulationMode || !firestore) return { success: false, data: null };
        try {
            const userRef = docFn(firestore, "users", userId);
            const docSnap = await getDocFn(userRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return { success: true, data: data.profile || null };
            }
            return { success: true, data: null };
        } catch (error) {
            console.error("❌ Firestore profile get error:", error);
            return { success: false, error };
        }
    },

    // Biometrics Operations
    async saveBiometrics(userId: string, config: any) {
        if (isSimulationMode || !firestore) return { success: false };
        try {
            const userRef = docFn(firestore, "users", userId);
            await setDocFn(userRef, {
                biometrics: {
                    ...config,
                    updatedAt: Timestamp?.now() || new Date().toISOString(),
                }
            }, { merge: true });
            return { success: true };
        } catch (error) {
            console.error("❌ Firestore biometrics save error:", error);
            return { success: false, error };
        }
    },

    async getBiometrics(userId: string) {
        if (isSimulationMode || !firestore) return { success: false, data: null };
        try {
            const userRef = docFn(firestore, "users", userId);
            const docSnap = await getDocFn(userRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return { success: true, data: data.biometrics || null };
            }
            return { success: true, data: null };
        } catch (error) {
            console.error("❌ Firestore biometrics get error:", error);
            return { success: false, error };
        }
    },

    // Transaction Operations
    async saveTransaction(userId: string, transaction: any) {
        if (isSimulationMode || !firestore) return { success: false };
        try {
            const transRef = docFn(firestore, "users", userId, "transactions", transaction.id);
            await setDocFn(transRef, {
                ...transaction,
                updatedAt: Timestamp?.now() || new Date().toISOString(),
            });
            return { success: true };
        } catch (error) {
            console.error("❌ Firestore transaction save error:", error);
            return { success: false, error };
        }
    },

    async getTransactions(userId: string, limitCount: number = 50) {
        if (isSimulationMode || !firestore) return { success: false, data: [] };
        try {
            const firestoreModule = require("firebase/firestore");
            const transactionsRef = collectionFn(firestore, "users", userId, "transactions");
            const q = firestoreModule.query(
                transactionsRef, 
                firestoreModule.orderBy("date", "desc"), 
                firestoreModule.limit(limitCount)
            );
            const querySnapshot = await getDocsFn(q);
            const transactions = querySnapshot.docs.map((doc: any) => ({
                ...doc.data(),
                id: doc.id
            }));
            return { success: true, data: transactions };
        } catch (error) {
            console.error("❌ Firestore transactions get error:", error);
            return { success: false, error, data: [] };
        }
    },

    async updateTransaction(userId: string, transactionId: string, updates: any) {
        if (isSimulationMode || !firestore) return { success: false };
        try {
            const transRef = docFn(firestore, "users", userId, "transactions", transactionId);
            await updateDocFn(transRef, {
                ...updates,
                updatedAt: Timestamp?.now() || new Date().toISOString(),
            });
            return { success: true };
        } catch (error) {
            console.error("❌ Firestore transaction update error:", error);
            return { success: false, error };
        }
    },

    async deleteTransaction(userId: string, transactionId: string) {
        if (isSimulationMode || !firestore) return { success: false };
        try {
            const transRef = docFn(firestore, "users", userId, "transactions", transactionId);
            await deleteDocFn(transRef);
            return { success: true };
        } catch (error) {
            console.error("❌ Firestore transaction delete error:", error);
            return { success: false, error };
        }
    },

    // Category Operations
    async saveCategory(userId: string, category: string) {
        if (isSimulationMode || !firestore) return { success: false };
        try {
            const catRef = docFn(firestore, "users", userId, "categories", category);
            await setDocFn(catRef, {
                name: category,
                createdAt: Timestamp?.now() || new Date().toISOString(),
            });
            return { success: true };
        } catch (error) {
            console.error("❌ Firestore category save error:", error);
            return { success: false, error };
        }
    },

    async getCategories(userId: string): Promise<{ success: boolean; data: string[]; error?: string }> {
        if (isSimulationMode || !firestore) return { success: false, data: [], error: "Not initialized" };
        try {
            const firestoreModule = require("firebase/firestore");
            const categoriesRef = collectionFn(firestore, "users", userId, "categories");
            const q = firestoreModule.query(categoriesRef, firestoreModule.orderBy("createdAt", "desc"));
            const querySnapshot = await getDocsFn(q);
            const categories = querySnapshot.docs.map((doc: any) => doc.data().name);
            return { success: true, data: categories };
        } catch (error: any) {
            console.error("❌ Firestore categories get error:", error);
            return { success: false, data: [], error: error.message };
        }
    },

    // Initialization
    async initializeData(userId: string): Promise<{ success: boolean; error?: string }> {
        if (isSimulationMode || !firestore) return { success: false, error: "Not initialized" };
        try {
            // Check categories
            const catRes = await this.getCategories(userId);
            if (catRes.success && catRes.data.length === 0) {
                const defaultCategories = [
                    'Food & Dining', 'Shopping', 'Transportation', 'Bills & Utilities',
                    'Entertainment', 'Healthcare', 'Education', 'Travel', 'Groceries'
                ];
                for (const cat of defaultCategories) {
                    await this.saveCategory(userId, cat);
                }
            }

            // Check transactions
            const transRes = await this.getTransactions(userId, 1);
            if (transRes.success && transRes.data.length === 0) {
                const { generateSimulatedTransactions } = await import('./localStorageService');
                const simulated = generateSimulatedTransactions(20);
                for (const txn of simulated) {
                    await this.saveTransaction(userId, txn);
                }
            }

            return { success: true };
        } catch (error: any) {
            console.error("❌ Firestore initialization error:", error);
            return { success: false, error: error.message };
        }
    }
};
