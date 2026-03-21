# api/core/agents/budget_agent.py

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from .base import BaseAgent
import json

class BudgetAdviceSchema(BaseModel):
    insights: List[str] = Field(description="A list of 3 concise, actionable insights or warnings based on the user's spending habits.")
    overall_sentiment: str = Field(description="A single word describing the overall financial health context: 'Excellent', 'Good', 'Warning', or 'Critical'")

class BudgetAgent(BaseAgent):
    """
    Proactive agent that analyzes spending behavior to generate 
    budget advice and alerts.
    """
    
    SYSTEM_INSTRUCTION = """
    You are an expert AI Budget Advisor.
    Look at the provided monthly spending summary and generate 3 clear, actionable insights for the user.
    
    Guidelines:
    - Identify out-of-control categories.
    - Praise good saving habits if visible.
    - Provide a concise (1 sentence max each) tooltip style advice.
    - Do not mention 'JSON' or the 'provided summary'. Connect directly with the user (e.g., "Your food spending seems...").
    """

    def generate_local_fallback(self, prompt: str, schema: Optional[Type[BudgetAdviceSchema]] = None) -> Optional[BudgetAdviceSchema]:
        """
        Local fallback when Gemini is unavailable.
        """
        return BudgetAdviceSchema(
            insights=[
                "Configure your GEMINI_API_KEY for advanced AI analysis.",
                "Your transactions are safely stored locally and in the cloud.",
                "Real-time budget insights will appear here once AI is active."
            ],
            overall_sentiment="Good"
        )

    def generate_advice(self, summary_data: Dict) -> Optional[BudgetAdviceSchema]:
        """
        Generates budget insights based on summary metrics.
        """
        response = self.generate_structured(
            prompt=json.dumps(summary_data, indent=2, default=str),
            schema=BudgetAdviceSchema,
            system_instruction=self.SYSTEM_INSTRUCTION
        )
        return response
