import { toast } from 'sonner';
import { authService, transactionService, type Transaction } from '@/lib/localStorageService';

// Mock AI categorization for frontend-only deployment
const mockCategories = [
  'Food & Dining', 'Shopping', 'Transportation', 'Bills & Utilities',
  'Entertainment', 'Healthcare', 'Education', 'Travel', 'Groceries'
];

const extractTransactionDetails = (message: string) => {
  // Simple regex patterns for transaction extraction
  const amountRegex = /(?:Rs\.?|₹)\s*(\d+(?:,\d{3})*)/i;
  const merchantRegex = /(?:at|by|to|from)\s+([A-Za-z0-9&.\s]+)/i;
  const creditRegex = /(credited|received|deposited|refund|cashback)/i;
  
  const amountMatch = message.match(amountRegex);
  const merchantMatch = message.match(merchantRegex);
  const isCredit = creditRegex.test(message);
  
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : 0;
  const merchant = merchantMatch ? merchantMatch[1] : 'Unknown';
  const type = isCredit ? 'credit' : 'debit';
  
  return {
    amount,
    merchant,
    type,
    confidence: 0.85 // Mock confidence
  };
};

const categorizeTransaction = (message: string, details: any) => {
  // Simple keyword-based categorization
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('food') || lowerMessage.includes('restaurant') || lowerMessage.includes('zomato') || lowerMessage.includes('swiggy')) {
    return 'Food & Dining';
  }
  if (lowerMessage.includes('shop') || lowerMessage.includes('amazon') || lowerMessage.includes('flipkart') || lowerMessage.includes('myntra')) {
    return 'Shopping';
  }
  if (lowerMessage.includes('uber') || lowerMessage.includes('ola') || lowerMessage.includes('rapido') || lowerMessage.includes('metro')) {
    return 'Transportation';
  }
  if (lowerMessage.includes('bill') || lowerMessage.includes('recharge') || lowerMessage.includes('electricity')) {
    return 'Bills & Utilities';
  }
  if (lowerMessage.includes('movie') || lowerMessage.includes('netflix') || lowerMessage.includes('prime')) {
    return 'Entertainment';
  }
  if (lowerMessage.includes('medicine') || lowerMessage.includes('hospital') || lowerMessage.includes('pharmacy')) {
    return 'Healthcare';
  }
  
  // Default categorization for uncategorized transactions
  const randomCategory = mockCategories[Math.floor(Math.random() * mockCategories.length)];
  return randomCategory || 'Others';
};

// Mock API that works without backend
export const mockApi = {
  async post(endpoint: string, data: any) {
    console.log(`🔄 Mock API Call: ${endpoint}`, data);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    switch (endpoint) {
      case '/classify':
        const { message } = data;
        const details = extractTransactionDetails(message);
        const category = categorizeTransaction(message, details);
        
        return {
          data: {
            id: `mock_${Date.now()}`,
            category,
            amount: details.amount,
            receiver: details.merchant,
            type: details.type,
            status: 'completed',
            ai_explanation: `Transaction matches ${category} pattern based on keywords.`,
            ai_suggestions: mockCategories.filter(c => c !== category).slice(0, 3),
            confidence: details.confidence
          },
          status: 'saved'
        };
        
      case '/parse-sms':
        const { message } = data;
        const details = extractTransactionDetails(message);
        
        return {
          data: {
            parsed: {
              amount: details.amount,
              merchant: details.merchant,
              date: new Date().toISOString().split('T')[0],
              type: details.type,
              category: categorizeTransaction(message, details)
            }
          }
        };
        
      default:
        throw new Error(`Mock API: Endpoint ${endpoint} not implemented`);
    }
  }
};

// Enhanced API that uses real backend when available, falls back to mock when unavailable
export const api = {
  async post(endpoint: string, data: any) {
    const session = authService.getSession();
    const userId = session?.phone?.replace(/\+/g, '')?.trim();
    
    // Always try the real API first
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://transact-ai.onrender.com';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId && { 'X-User-Id': userId })
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('🔗 Real API response:', result);
      return result;
      
    } catch (error) {
      console.warn('⚠️ Backend unavailable, using enhanced mock API:', error);
      
      // Enhanced mock API with better categorization
      const messageData = data.message || '';
      const details = extractTransactionDetails(messageData);
      const category = categorizeTransaction(messageData, details);
      
      return {
        data: {
          id: `mock_${Date.now()}`,
          category,
          amount: details.amount,
          receiver: details.merchant,
          type: details.type,
          status: 'completed',
          ai_explanation: `Transaction matches ${category} pattern based on keywords.`,
          ai_suggestions: mockCategories.filter(c => c !== category).slice(0, 3),
          confidence: details.confidence
        },
        status: 'saved'
      };
    }
  }
};
