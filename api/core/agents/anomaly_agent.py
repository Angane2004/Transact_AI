# api/core/agents/anomaly_agent.py

from pydantic import BaseModel, Field
from typing import Optional
from .base import BaseAgent
import json

class AnomalySchema(BaseModel):
    is_anomaly: bool = Field(description="True if the transaction is highly unusual, suspicious, or completely out of proportion for a typical individual's personal finance profile.")
    anomaly_reason: Optional[str] = Field(description="A concise 1-sentence explanation of why it was flagged. If not an anomaly, return null.")

class AnomalyAgent(BaseAgent):
    """
    Agent responsible for flagging unusual, out-of-proportion, or suspicious transactions.
    """
    
    SYSTEM_INSTRUCTION = """
    You are an AI personal finance watchdog. Your job is to analyze a single new transaction 
    and determine if it is a glaring anomaly. 
    
    Consider the amount in Indian Rupees (INR).
    Examples of anomalies:
    - ₹50,000 for 'Food' or 'Grocery' (way too high)
    - ₹1,00,000+ for 'Transport' (unless flight booking context exists)
    - Unusually high 'Others' category spending without context.
    - Potential scam indicators or weird merchant names for large sums.
    
    If it seems normal for a middle-class/upper-middle-class individual, return is_anomaly: false.
    If it is flagged, provide a short, helpful reason.
    """

    def detect(self, amount: Optional[float], category: str, merchant: Optional[str], text: str) -> Optional[AnomalySchema]:
        """
        Determines if a transaction is anomalous.
        """
        prompt = {
            "transaction_text": text,
            "parsed_amount_inr": amount,
            "predicted_category": category,
            "merchant_receiver": merchant
        }
        
        response = self.generate_structured(
            prompt=json.dumps(prompt, indent=2),
            schema=AnomalySchema,
            system_instruction=self.SYSTEM_INSTRUCTION
        )
        return response
