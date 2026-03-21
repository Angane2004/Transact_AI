# api/core/agents/chat_agent.py

from .base import BaseAgent
from typing import Optional, List, Dict
import json

class ChatAgent(BaseAgent):
    """
    Conversational agent for answering general financial queries 
    based on the user's transaction history context.
    """
    
    SYSTEM_INSTRUCTION = """
    You are a friendly, highly intelligent Personal Finance AI Assistant. 
    A user is asking a question about their transaction history. 
    You will be provided with the user's raw question AND a context block containing their recent transactions or relevant summary data.
    
    Rules:
    - Answer the question conversationally.
    - If exact numbers are asked, calculate or locate them from the provided context.
    - Be concise and helpful. Use formatting (bullet points, bold text) if it makes the answer easier to read.
    - Do NOT talk about the 'provided context' or 'JSON' to the user. Speak as if you naturally know their financial data.
    - If the user asks something completely unrelated to finance, politely redirect them.
    - Speak directly to the user (e.g., "You spent...", "Your highest transaction...").
    """

    def chat(self, user_query: str, context_data: List[Dict]) -> Optional[str]:
        """
        Answers a user query given a set of transaction data.
        """
        # We inject the data and the user query
        prompt = f"""
## Context Data (Recent Transactions):
{json.dumps(context_data, indent=2, default=str)}

## User Question:
{user_query}
"""
        response = self.generate_text(
            prompt=prompt,
            system_instruction=self.SYSTEM_INSTRUCTION
        )
        return response
