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

    def generate_local_fallback(self, prompt: str, schema: Optional[Type[T]] = None) -> Optional[T]:
        """
        Expert regex-based fallback for Indian banking SMS.
        """
        text = prompt.lower()
        
        # 1. Amount Extraction (e.g. Rs. 500, INR 1,200.50, ₹ 100)
        amount = None
        amt_match = re.search(r'(?:rs|inr|₹)\.?\s?([\d,]+\.?\d*)', text)
        if amt_match:
            amount = float(amt_match.group(1).replace(',', ''))

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
        upi_ref = None
        ref_match = re.search(r'(?:upi|ref|ref\sno)\.?\s?(\d{12})', text)
        if ref_match:
            upi_ref = ref_match.group(1)

        # 5. Merchant extraction (Heuristic-based)
        merchant = "Unknown"
        if "to" in text:
            m_match = re.search(r'to\s+([a-z\s0-9]{3,20})(?=\s|on|at|\.\s|$)', text)
            if m_match: merchant = m_match.group(1).strip()
        elif "at" in text:
            m_match = re.search(r'at\s+([a-z\s0-9]{3,20})(?=\s|on|at|\.\s|$)', text)
            if m_match: merchant = m_match.group(1).strip()
        
        # 6. Basic Date Extraction
        date_match = re.search(r'(\d{2}-[a-z]{3}-\d{2,4})', text)
        date_str = date_match.group(1) if date_match else None

        result = ParsedTransactionSchema(
            amount=amount,
            type=tx_type,
            account_last4=last4,
            merchant=merchant.title() if merchant else "Unknown",
            upi_ref=upi_ref,
            date=date_str
        )
        
        return result

    def parse(self, text: str) -> Optional[ParsedTransactionSchema]:
        """
        Parses raw text into a ParsedTransactionSchema.
        """
        response = self.generate_structured(
            prompt=text,
            schema=ParsedTransactionSchema,
            system_instruction=self.SYSTEM_INSTRUCTION
        )
        return response
