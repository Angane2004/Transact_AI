# api/core/agents/parser_agent.py

import re
from pydantic import BaseModel, Field
from typing import Optional, Type, TypeVar
from .base import BaseAgent

T = TypeVar('T', bound=BaseModel)

class ParsedTransactionSchema(BaseModel):
    amount: Optional[float] = Field(default=None, description="The numeric amount of the transaction. Use absolute positive value.")
    type: Optional[str] = Field(default=None, description="Must be 'debit' or 'credit'", pattern="^(debit|credit)$")
    account_last4: Optional[str] = Field(default=None, description="The last 4 digits of the bank account or card involved, if present.")
    merchant: Optional[str] = Field(default=None, description="The name of the merchant, receiver, or sender.")
    upi_ref: Optional[str] = Field(default=None, description="The UPI reference number (usually 12 digits), if present.")
    upi_id: Optional[str] = Field(default=None, description="The UPI ID of the counterparty, if present.")
    date: Optional[str] = Field(default=None, description="The date of the transaction in YYYY-MM-DD format if possible.")
    balance: Optional[float] = Field(default=None, description="The available balance after the transaction, if present.")

class ParserAgent(BaseAgent):
    """
    Agent responsible for extracting structured dictionary from arbitrary bank SMS, 
    emails, or notification texts.
    """
    
    SYSTEM_INSTRUCTION = """
    You are a financial parsing assistant expert at reading Indian banking SMS and notification alerts.
    Extract the transaction details into the defined JSON schema.
    If a certain piece of information is missing from the text, return null for that field.
    """

    def is_enabled(self) -> bool:
        # ParserAgent is always enabled because it has a regex-based fallback
        # that doesn't even require the local onnx model.
        return True

    def generate_local_fallback(self, prompt: str, schema: Optional[Type[T]] = None) -> Optional[T]:
        """
        Expert regex-based fallback for Indian banking SMS.
        """
        try:
            text = prompt.lower()
            
            # 1. Amount Extraction (e.g. Rs. 500, INR 1,200.50, ₹ 100)
            amount = None
            amt_match = re.search(r'(?:rs|inr|₹)\.?\s?([\d,]+\.?\d*)', text)
            if amt_match:
                try:
                    amount = float(amt_match.group(1).replace(',', ''))
                except ValueError:
                    amount = None
    
            # 2. Transaction Type
            tx_type = "debit"
            if "credited" in text or "received" in text or "deposited" in text:
                tx_type = "credit"
            elif "debited" in text or "spent" in text or "paid" in text:
                tx_type = "debit"
    
            # 3. Last 4 Digits
            last4 = None
            last4_match = re.search(r'(?:a/c|acct|card|xx)(?:\s|no)?(\d{4})', text)
            if last4_match:
                last4 = last4_match.group(1)
    
            # 4. UPI Details
            upi_id = None
            upi_ref = None
            ref_match = re.search(r'(?:upi|ref|ref\sno)\.?\s?(\d{12})', text)
            if ref_match:
                upi_ref = ref_match.group(1)
            
            # 5. Merchant extraction (Heuristic-based)
            merchant = "Unknown"
            # Try different patterns, prioritize "to", "at", "towards", "by"
            patterns = [
                r'to\s+([a-z\s0-9\.&]{2,30})',
                r'at\s+([a-z\s0-9\.&]{2,30})',
                r'towards\s+([a-z\s0-9\.&]{2,30})',
                r'by\s+([a-z\s0-9\.&]{2,30})',
            ]
            
            for p in patterns:
                m_match = re.search(p, text)
                if m_match:
                    candidate = m_match.group(1).strip()
                    # If it starts with a number (like a date or account), it's probably not the merchant
                    if re.match(r'^\d', candidate):
                        continue
                        
                    # Clean up: stop at first occurrence of common "filler" words or sentence ends
                    stop_words = ['on', 'at', 'from', 'via', 'towards', 'using', 'successful', 'for', 'a/c', 'account', 'ref', 'available', 'avbl', 'bal', 'is', 'has', 'in']
                    
                    # Split by space and look for stop words
                    words = candidate.split()
                    final_words = []
                    for w in words:
                        # Strip trailing periods/commas for check
                        clean_w = w.rstrip('.,')
                        if clean_w in stop_words:
                            break
                        final_words.append(w)
                    
                    if final_words:
                        merchant = " ".join(final_words).rstrip('.,')
                        break
    
            # 6. Basic Date Extraction
            date_match = re.search(r'(\d{2}-[a-z]{3}-\d{2,4})', text)
            date_str = date_match.group(1) if date_match else None
    
            result = ParsedTransactionSchema(
                amount=amount,
                type=tx_type,
                account_last4=last4,
                merchant=merchant.title() if merchant != "Unknown" else "Unknown",
                upi_ref=upi_ref,
                upi_id=None,
                date=date_str
            )
            
            return result
        except Exception as e:
            print(f"[ParserAgent] Critical error in local fallback: {e}")
            # Ensure we return at least a default schema instead of None to avoid 500
            return ParsedTransactionSchema(merchant="Error in Parsing", type="debit")

    def fallback_parse(self, text: str) -> ParsedTransactionSchema:
        """
        Last-resort parse without Gemini (amount + merchant from shared preprocessors).
        Used when API key is missing, quota exceeded, or Gemini returns nothing.
        """
        from core.preprocessor import extract_amount, extract_recipient

        lower = text.lower()
        tx_type = "credit" if any(
            w in lower for w in ("credited", "received", "deposited", "credit to")
        ) else "debit"
        amt = extract_amount(text)
        merch = extract_recipient(text) or "Unknown"
        return ParsedTransactionSchema(
            amount=amt,
            type=tx_type,
            merchant=merch,
        )

    def parse(self, text: str) -> ParsedTransactionSchema:
        """
        Parses raw text into a ParsedTransactionSchema.
        Prefer Gemini when configured; otherwise regex/heuristic paths inside generate_structured.
        Always returns a schema (never None) so /parse-sms works without GEMINI_API_KEY.
        """
        response = self.generate_structured(
            prompt=text,
            schema=ParsedTransactionSchema,
            system_instruction=self.SYSTEM_INSTRUCTION,
        )
        if response is not None:
            return response
        fb = self.generate_local_fallback(text, ParsedTransactionSchema)
        if fb is not None:
            return fb
        return self.fallback_parse(text)
