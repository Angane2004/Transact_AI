# api/core/agents/confidence_agent.py

from pydantic import BaseModel, Field
from typing import List, Optional
from .base import BaseAgent
import json

class ConfidenceSchema(BaseModel):
    suggestions: List[str] = Field(description="The top 2 to 3 most likely transaction categories.")
    explanation: str = Field(description="A concise, 1-2 sentence explanation of why the classification is ambiguous and why these suggestions make sense to the user.")

class ConfidenceAgent(BaseAgent):
    """
    Agent responsible for explaining why a transaction prediction was low-confidence,
    and offering intelligent alternative category suggestions.
    """
    
    SYSTEM_INSTRUCTION = """
    You are a helpful personal finance AI. The primary categorization model failed to classify a transaction with high confidence.
    Your job is to look at the transaction details, the model's top guessed category, and provide 2-3 logical alternative categories 
    along with a brief, friendly explanation of why providing a category is difficult.
    
    Speak directly to the user in a helpful, concise tone.
    Do NOT mention "the model" or technical details. Frame it as "I noticed..." or "This looks like..."
    """

    def explain(self, text: str, amount: Optional[float], predicted: str, categories: List[str]) -> Optional[ConfidenceSchema]:
        """
        Generates an explanation for low confidence.
        """
        prompt = {
            "transaction_text": text,
            "amount": amount,
            "best_guess": predicted,
            "available_categories": categories
        }
        
        response = self.generate_structured(
            prompt=json.dumps(prompt, indent=2),
            schema=ConfidenceSchema,
            system_instruction=self.SYSTEM_INSTRUCTION
        )
        return response
