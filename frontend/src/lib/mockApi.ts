import { toast } from 'sonner';
import { authService, transactionService, type Transaction } from '@/lib/localStorageService';

// Mock categories for fallback
const mockCategories = [
  'Food & Dining', 'Shopping', 'Transportation', 'Bills & Utilities',
  'Entertainment', 'Healthcare', 'Education', 'Travel', 'Groceries'
];

// Simple transaction extraction
const extractTransactionDetails = (message: string) => {
  const amountRegex = /(?:Rs\.?|₹)\s*(\d+(?:,\d{3})*)/i;
  const merchantRegex = /(?:at|by|to|from)\s+([A-Za-z0-9&.\s]+)/i;
  const creditRegex = /(credited|received|deposited|refund|cashback)/i;
  
  const amountMatch = message.match(amountRegex);
  const merchantMatch = message.match(merchantRegex);
  const isCredit = creditRegex.test(message);
  
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : 0;
  const merchant = merchantMatch ? merchantMatch[1] : 'Unknown';
  const type = isCredit ? 'credit' : 'debit';
  
  return { amount, merchant, type, confidence: 0.85 };
};

// Simple categorization
const categorizeTransaction = (message: string, details: any) => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('food') || lowerMessage.includes('restaurant')) {
    return 'Food & Dining';
  }
  if (lowerMessage.includes('shop') || lowerMessage.includes('amazon')) {
    return 'Shopping';
  }
  if (lowerMessage.includes('uber') || lowerMessage.includes('ola')) {
    return 'Transportation';
  }
  if (lowerMessage.includes('bill') || lowerMessage.includes('recharge')) {
    return 'Bills & Utilities';
  }
  
  return mockCategories[Math.floor(Math.random() * mockCategories.length)] || 'Others';
};

// API with fallback to mock when backend is unavailable
export const api = {
  async post(endpoint: string, data: any, config?: any) {
    const session = authService.getSession();
    const userId = session?.phone?.replace(/\+/g, '')?.trim();
    
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeout = config?.timeout || 30000; // Default 30s timeout
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://transact-ai.onrender.com';
      console.log(`📡 Calling API: ${API_URL}${endpoint}`);
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId && { 'X-User-Id': userId })
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('🔗 Real API response:', result);
      
      // Return in axios-like format for consistency
      return {
        data: result,
        status: response.status
      };
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.warn('⚠️ API request timed out');
      } else {
        console.warn('⚠️ Backend unavailable or error, using mock API:', error);
      }
      
      const messageData = data.message || '';
      const txDetails = extractTransactionDetails(messageData);
      const category = categorizeTransaction(messageData, txDetails);
      
      // Return mock data in the same axios-like format
      // For /parse-sms, we need a 'parsed' field
      const isParseSms = endpoint === '/parse-sms';
      
      return {
        data: isParseSms ? {
          status: 'success',
          parsed: {
            amount: txDetails.amount,
            merchant: txDetails.merchant,
            type: txDetails.type,
            confidence: txDetails.confidence,
            category: category
          }
        } : {
          id: `mock_${Date.now()}`,
          category,
          amount: txDetails.amount,
          receiver: txDetails.merchant,
          type: txDetails.type,
          status: 'saved',
          ai_explanation: `Transaction matches ${category} pattern.`,
          ai_suggestions: mockCategories.filter(c => c !== category).slice(0, 3),
          confidence: txDetails.confidence
        },
        status: 200,
        isMock: true
      };
    }
  }
};
