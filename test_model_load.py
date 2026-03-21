import sys
import os
import time

# Add current directory to path
sys.path.append(os.getcwd())

print("Testing TransactionClassifier load...")
start = time.time()
try:
    from core.model import TransactionClassifier
    classifier = TransactionClassifier()
    classifier.load(dir_path="models", name="classifier")
    print(f"Model loaded successfully in {time.time() - start:.2f} seconds")
    
    # Test a prediction
    print("Testing a prediction...")
    text = "Zomato order for 500"
    cat, conf, meta = classifier.predict(text)
    print(f"Prediction for '{text}': {cat} (conf: {conf:.2f})")
except Exception as e:
    print(f"Error during diagnostic: {e}")
    import traceback
    traceback.print_exc()
