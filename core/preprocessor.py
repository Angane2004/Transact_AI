# core/preprocessor.py

"""
Improved preprocessing utilities for transaction classification.
Includes:
- Strong amount extraction
- Accurate merchant/recipient extraction
- Clean text pipeline
- Noise removal
"""

import re
from typing import List, Optional


# ============================================================
# 1. AMOUNT EXTRACTION
# ============================================================

def extract_amount(text: str) -> Optional[float]:
    """
    Extract amount from transaction text.
    Prioritizes matches with currency symbols to avoid account numbers (like XX1234).
    """

    # 1. Try to find amounts with explicit currency symbols (High Priority)
    currency_pattern = r"(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)"
    currency_matches = re.finditer(currency_pattern, text, flags=re.IGNORECASE)
    
    # Take the first currency match as it's most likely the actual amount
    for match in currency_matches:
        amount_str = match.group(1).replace(",", "")
        try:
            return float(amount_str)
        except:
            continue

    # 2. Try to find numbers following transaction keywords
    context_pattern = r"(?:debited for|spent|paid|amount)\s+([\d,]+(?:\.\d{1,2})?)"
    context_matches = re.finditer(context_pattern, text, flags=re.IGNORECASE)
    for match in context_matches:
        amount_str = match.group(1).replace(",", "")
        try:
            return float(amount_str)
        except:
            continue

    # 3. Last resort: match any number but SKIP those that look like account numbers (Avoid picking up XX1234)
    all_numbers_pattern = r"([\d,]+(?:\.\d{1,2})?)"
    all_matches = re.finditer(all_numbers_pattern, text, flags=re.IGNORECASE)
    for match in all_matches:
        val_str = match.group(1).replace(",", "")
        # Heuristic: account numbers are often precisely 4 digits and preceded by 'XX' or 'no.'
        start = match.start()
        prefix = text[max(0, start-10):start].lower()
        if "xx" in prefix or "no." in prefix or "acct" in prefix or "a/c" in prefix:
            continue
            
        try:
            return float(val_str)
        except:
            continue
                 
    return None


# ============================================================
# 2. MERCHANT / RECIPIENT NAME CLEANUP
# ============================================================

def cleanup_merchant(name: str) -> str:
    """
    Removes unnecessary tokens from merchant names.
    """
    bad_words = ["google", "pay", "gpay", "upi", "using", "via", "gp"]
    parts = name.lower().split()

    cleaned = [p for p in parts if p not in bad_words]

    return " ".join(cleaned).strip()


# ============================================================
# 3. RECIPIENT EXTRACTION
# ============================================================

def extract_recipient(text: str) -> str:
    """
    Extract recipient or merchant name reliably.
    Handles phone numbers, UPI IDs, and merchant names.
    """
    t = text.lower().strip()

    # ---------------------------
    # 1. Merchant name extraction
    # ---------------------------
    merchant_patterns = [
        r"paid to (.+?)(?: using| via| with|$)",
        r"paid at (.+?)(?: using| via| with|$)",
        r"sent to (.+?)(?: using| via| with|$)",
        r"received from (.+?)(?: using| via| with|$)",
        r"credited from (.+?)(?: using| via| with|$)",
    ]

    for pat in merchant_patterns:
        m = re.search(pat, t)
        if m:
            raw = m.group(1).strip()

            # Remove trailing common words
            remove_words = [
                "google pay",
                "gpay",
                "phonepe",
                "paytm",
                "upi",
                "transaction",
                "ref",
                "refno",
                "using",
                "via"
            ]
            for w in remove_words:
                raw = raw.replace(w, "").strip()

            # Keep only first 2 words for merchant names
            cleaned = " ".join(raw.split()[:2]).strip()
            return cleaned if cleaned else raw

    # ---------------------------
    # 2. Phone number (only if no merchant found)
    # ---------------------------
    phone = re.search(r"\b\d{10}\b", t)
    if phone:
        return phone.group(0)

    # ---------------------------
    # 3. UPI ID (very last)
    # ---------------------------
    upi = re.search(r"\b[\w\.-]+@[\w]+\b", t)
    if upi:
        return upi.group(0)

    return "Unknown"



# ============================================================
# 4. TEXT CLEANING PIPELINE FOR MODEL INPUT
# ============================================================

def clean_text_for_model(text: str) -> str:
    """
    Clean text for transformer model:
    - Lowercase
    - Remove punctuation
    - Remove app words
    - Keep useful tokens
    """

    t = text.lower()

    # Remove special characters
    t = re.sub(r"[^a-z0-9 ]", " ", t)

    # Remove noisy tokens
    noise = ["google", "pay", "gpay", "phonepe", "using", "via", "gp", "upi", "paytm"]
    for n in noise:
        t = t.replace(n, "")

    # Compress spaces
    t = re.sub(r"\s+", " ", t).strip()

    return t


# ============================================================
# MAIN CLEAN FUNCTION (Used in Dataset Training Only)
# ============================================================

class TransactionPreprocessor:
    """
    Compatibility class; only retains clean() for backward use.
    """

    def clean(self, text: str) -> str:
        return clean_text_for_model(text)

    def clean_batch(self, texts: List[str]):
        return [clean_text_for_model(t) for t in texts]


# ============================================================
# TEST EXAMPLES
# ============================================================

if __name__ == "__main__":
    examples = [
        "₹389 paid to 8697704326 using Google Pay",
        "₹850 paid at McDonald's using Google Pay",
        "Rs. 1250 paid at FirstCry for kids essentials",
        "Sent ₹500 to Rahul Sharma via UPI"
    ]

    for e in examples:
        print("------")
        print("RAW:", e)
        print("AMOUNT:", extract_amount(e))
        print("RECIPIENT:", extract_recipient(e))
        print("CLEAN:", clean_text_for_model(e))
