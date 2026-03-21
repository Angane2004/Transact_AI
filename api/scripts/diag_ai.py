import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.append(str(Path(__file__).parent.parent.parent))

def test_gemini():
    from api.core.agents.chat_agent import ChatAgent
    print("\n--- Testing Gemini API ---")
    agent = ChatAgent()
    key = os.getenv("GEMINI_API_KEY")
    if not key or "your_actual" in key:
        print("[INFO] GEMINI_API_KEY is not set or is a placeholder. Using fallback.")
    
    try:
        # Should trigger fallback if key is missing
        response = agent.chat("Hello!", [])
        if response:
            print(f"[PASS] Agent Response: {response}")
            return True
        else:
            print("[FAIL] Agent returned empty response.")
            return False
    except Exception as e:
        print(f"[FAIL] Agent Error: {e}")
        return False

def test_classifier():
    from core.model import TransactionClassifier
    print("\n--- Testing Local Classifier ---")
    try:
        classifier = TransactionClassifier()
        # Mocking load to avoid real file issues if necessary, but we want to test real load
        classifier.load(dir_path="models", name="classifier")
        print(f"[PASS] Classifier loaded. ML disabled status: {classifier.ml_disabled}")
        
        test_text = "Sent 500 for dinner at Pizza Hut"
        results = classifier.predict_batch([test_text])
        cat, conf, meta = results[0]
        print(f"[PASS] Prediction: Category={cat}, Conf={conf:.2f}, Strategy={meta.get('strategy')}")
        return True
    except Exception as e:
        print(f"[FAIL] Classifier Error: {e}")
        # traceback.print_exc()
        return False

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv("api/.env")
    
    gemini_ok = test_gemini()
    classifier_ok = test_classifier()
    
    print("\n--- Summary ---")
    print(f"Gemini/Agent: {'READY' if gemini_ok else 'NOT WORKING'}")
    print(f"Local Classifier: {'READY' if classifier_ok else 'NOT WORKING'}")
