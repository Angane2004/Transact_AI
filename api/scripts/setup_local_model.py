import os
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch.onnx

def export_model():
    model_name = "distilbert-base-uncased-finetuned-sst-2-english"
    save_dir = os.path.join(os.path.dirname(__file__), "..", "models", "local_ai")
    os.makedirs(save_dir, exist_ok=True)
    
    print(f"Downloading and exporting {model_name}...")
    
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    model.eval()
    
    # Create dummy input for ONNX export
    dummy_input = tokenizer("Transaction test message", return_tensors="pt")
    
    onnx_path = os.path.join(save_dir, "model.onnx")
    
    torch.onnx.export(
        model,
        (dummy_input["input_ids"], dummy_input["attention_mask"]),
        onnx_path,
        input_names=["input_ids", "attention_mask"],
        output_names=["logits"],
        dynamic_axes={
            "input_ids": {0: "batch_size", 1: "sequence_length"},
            "attention_mask": {0: "batch_size", 1: "sequence_length"},
            "logits": {0: "batch_size"},
        },
        opset_version=12
    )
    
    tokenizer.save_pretrained(save_dir)
    print(f"Local AI Model exported to {onnx_path}")

if __name__ == "__main__":
    export_model()
