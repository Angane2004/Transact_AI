import os
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

class LocalBrain:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LocalBrain, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        self.model_dir = os.path.join(os.path.dirname(__file__), "..", "models", "local_ai")
        self.onnx_path = os.path.join(self.model_dir, "model.onnx")
        self.tokenizer = None
        self.session = None
        self._initialized = True
        
        if os.path.exists(self.onnx_path):
            self.load_model()

    def is_ready(self) -> bool:
        return self.session is not None and self.tokenizer is not None

    def load_model(self):
        try:
            print(f"Loading Local AI Model from {self.onnx_path}...")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_dir)
            self.session = ort.InferenceSession(self.onnx_path)
            print("Local AI Model loaded successfully.")
        except Exception as e:
            print(f"Failed to load Local AI Model: {e}")

    def predict(self, text: str):
        if not self.is_ready():
            return None
            
        inputs = self.tokenizer(text, return_tensors="np", padding=True, truncation=True)
        # onnxruntime expects specific input names defined during export
        ort_inputs = {
            "input_ids": inputs["input_ids"].astype(np.int64),
            "attention_mask": inputs["attention_mask"].astype(np.int64),
        }
        
        logits = self.session.run(None, ort_inputs)[0]
        # For sst-2, logits[0] is negative, logits[1] is positive
        # We can use this as a generic score for now, or adapt it for multi-class
        return logits

    def get_embeddings(self, text: str):
        """
        Extract hidden states/embeddings if needed for semantic search.
        Note: The current exported model is a classification head, so it returns logits.
        """
        if not self.is_ready():
            return None
        return self.predict(text)

# Singleton instance
local_brain = LocalBrain()
