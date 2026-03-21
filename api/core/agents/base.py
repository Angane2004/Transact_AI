# api/core/agents/base.py

import os
from google import genai
from pydantic import BaseModel
from typing import TypeVar, Type, Optional
from dotenv import load_dotenv
import concurrent.futures

load_dotenv()

# Diagnostics for the user
api_key_check = os.getenv("GEMINI_API_KEY")
if api_key_check:
    masked_key = api_key_check[:4] + "..." + api_key_check[-4:] if len(api_key_check) > 8 else "***"
    print(f"[BaseAgent] GEMINI_API_KEY found: {masked_key}")
else:
    print(f"[BaseAgent] GEMINI_API_KEY is NOT set. Current CWD: {os.getcwd()}")
    print(f"[BaseAgent] API folder .env exists: {os.path.exists('api/.env') or os.path.exists('.env')}")

T = TypeVar('T', bound=BaseModel)

class BaseAgent:
    """
    Base class for all Google Gemini AI Agents in TransactAI.
    Provides common initialization and structured generation methods.
    """
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            self.client = None
        else:
            self.client = genai.Client(api_key=self.api_key)
        
        # Default model, can be overridden by subclasses
        self.default_model = "gemini-2.5-flash"
        
        # Local AI Brain for fallbacks
        from ..local_brain import local_brain
        self.local_brain = local_brain
    
    def is_enabled(self) -> bool:
        """Check if the agent has valid credentials OR a local brain ready."""
        return self.client is not None or self.local_brain.is_ready()

    def generate_local_fallback(self, prompt: str, schema: Optional[Type[T]] = None) -> Optional[T]:
        """
        Handle local AI inference when Gemini is unavailable.
        """
        if not self.local_brain.is_ready():
            return None
            
        print(f"🏠 [BaseAgent] Falling back to Local AI for: {self.__class__.__name__}")
        # Local brain currently returns logits for classification
        # For structured parsing, we will implement more specific logic in subclasses
        return None 

    def generate_structured(self, prompt: str, schema: Type[T], system_instruction: str = None) -> Optional[T]:
        """
        Generate a structured response using Gemini's structured outputs feature.
        Falls back to local AI if Gemini is disabled.
        """
        if not self.is_enabled():
            return None
            
        if self.client is None:
            return self.generate_local_fallback(prompt, schema)
            
        try:
            config = {
                 "response_mime_type": "application/json",
                 "response_schema": schema,
            }
            if system_instruction:
                config["system_instruction"] = system_instruction

            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    self.client.models.generate_content,
                    model=self.default_model,
                    contents=prompt,
                    config=config
                )
                response = future.result(timeout=15) # 15 second internal timeout
            
            # response.text should be valid XML/JSON matching the schema, but we can access response.parsed
            # Google genai structured output often sets .parsed if configured correctly.
            # Using Pydantic to validate just in case.
            if hasattr(response, "parsed") and response.parsed:
                 return response.parsed
                 
            # Fallback to manual parsing if .parsed is not populated but text is returned
            return schema.model_validate_json(response.text)
            
        except Exception as e:
            print(f"[{self.__class__.__name__}] Error generating structured output: {e}")
            return None

    def generate_text(self, prompt: str, system_instruction: str = None) -> Optional[str]:
        """
        Generate a simple text response.
        Falls back to local AI if Gemini is disabled.
        """
        if not self.is_enabled():
            return None
            
        if self.client is None:
            # For text, we can just return the raw fallback result if it's a string
            result = self.generate_local_fallback(prompt)
            return str(result) if result else None

        try:
            config = {}
            if system_instruction:
                config["system_instruction"] = system_instruction

            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    self.client.models.generate_content,
                    model=self.default_model,
                    contents=prompt,
                    config=config
                )
                response = future.result(timeout=15) # 15 second internal timeout
            return response.text
        except Exception as e:
            print(f"[{self.__class__.__name__}] Error generating text: {e}")
            return None
