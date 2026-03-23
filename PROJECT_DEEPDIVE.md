# TransactAI: Project Deep Dive

TransactAI is an advanced, AI-driven financial management platform designed to automate transaction tracking and provide deep financial insights through intelligent categorization of bank SMS and notifications.

## 🚀 System Architecture

TransactAI follows a modern full-stack architecture with a focus on AI integration and offline-first capabilities.

### 1. Frontend (Next.js & React)
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS with custom premium aesthetics.
- **Animations**: Framer Motion for smooth UI transitions and micro-interactions.
- **State Management**: React Hooks (useState, useEffect, useMemo, useCallback).
- **Local Storage & Sync**: 
  - `localStorageService`: Manages local data for offline use.
  - `firestoreService`: Synchronizes data with Firebase Firestore for cross-device access.
- **Key Components**:
  - `DashboardCharts`: Visualizes spending patterns using interactive charts.
  - `TransactionList`: Displays analyzed transactions with categorization capabilities.
  - `PasteSmsDialog`: Interface for manually adding bank SMS for AI analysis.
  - `PinLock`: Secure entry flow protecting financial data.

### 2. Backend (FastAPI & Python)
- **Framework**: FastAPI for high-performance, asynchronous API endpoints.
- **Database**: SQLAlchemy with SQLite for transactional data and feedback storage.
- **CORS Handling**: Robust configuration for secure communication with the frontend.
- **Task Scheduling**: `scheduler.py` for nightly model retraining based on user feedback.

## 🧠 AI & Machine Learning Stack

TransactAI employs a unique hybrid approach to transaction intelligence.

### 1. Hybrid Transaction Classifier
The core classification logic (`core/model.py`) layers three methods to ensure accuracy and speed:
1.  **Deterministic Rule Engine**: Uses regex and keywords for lightning-fast, high-confidence matches (e.g., "HDFC BANK" -> "Bills").
2.  **Transformer-based Classifier**: A fine-tuned **DistilBERT** model that understands the semantic context of transaction messages.
3.  **Embedding-based Centroids**: Uses **SentenceTransformers** as a robust fallback. It calculates the cosine similarity between a new transaction and established category "centroids."

### 2. Google Gemini Powered AI Agents
TransactAI integrates specialized agents via the Google GenAI SDK:
- **ParserAgent**: Extracts structured data (Amount, Merchant, UPI ID, Date) from raw Indian banking SMS.
- **ConfidenceAgent**: Provides natural language explanations for "low confidence" predictions and suggests alternatives.
- **AnomalyAgent**: Analyzes spending behavior to detect unusual or suspicious transactions.
- **ChatAgent**: An interactive "Financial Partner" that answers user questions based on their transaction history.
- **BudgetAgent**: Generates personalized, actionable financial advice based on monthly spending summaries.

### 3. Local Brain Fallback
For environments where the Gemini API is inaccessible, a **LocalBrain** (`api/core/local_brain.py`) utilizes **ONNX Runtime** and **HuggingFace Transformers** to provide basic local classification, ensuring the app remains smart even without an internet connection.

## 🛠️ Key Workflows

### Transaction Lifecycle
1.  **Input**: A bank SMS is received (simulated via `NotificationSimulator` or pasted manually).
2.  **Preprocessing**: Text is cleaned and normalized (removing account numbers, dates).
3.  **Classification**: The Hybrid Classifier assigns a category (e.g., Food, Shopping).
4.  **AI Parsing**: `ParserAgent` extracts the exact amount and recipient name.
5.  **Persistence**: The transaction is saved to the local database and synced to Firestore.
6.  **Insights**: Dashboard charts are updated in real-time.

### Continuous Improvement (Feedback Loop)
- Users can correct a transaction's category.
- Corrections are stored in the `feedback` table.
- The system automatically triggers a **Retraining Task** (`retrain-model`) to improve the ML model's accuracy over time based on user behavior.

## 🔒 Security
- **PIN Setup**: Mandatory 4-digit PIN for dashboard access.
- **Session Management**: Secure storage of user identifiers.
- **Environment Isolation**: Separate `.env` configurations for local dev and production.
