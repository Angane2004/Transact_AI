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
    Handles phone numbers, UPI IDs, and merchant names with improved cleaning.
    """
    t = text.lower().strip()

    # 1. Merchant name extraction patterns (Heuristic-based)
    # Order matters: more specific patterns first
    patterns = [
        r'for\s+([a-z\s0-9\._&]{2,40})',
        r'paid to\s+([a-z\s0-9\._&]{2,40})',
        r'sent to\s+([a-z\s0-9\._&]{2,40})',
        r'at\s+([a-z\s0-9\._&]{2,40})',
        r'towards\s+([a-z\s0-9\._&]{2,40})',
        r'by\s+([a-z\s0-9\._&]{2,40})',
        r'received from\s+([a-z\s0-9\._&]{2,40})',
        r'to\s+([a-z\s0-9\._&]{2,40})',
    ]

    merchant = "Unknown"
    for p in patterns:
        m_match = re.search(p, t)
        if m_match:
            candidate = m_match.group(1).strip()
            # Skip if it looks like a date or account number or IS an amount
            # If it starts with a number and has no letters, it's probably not a merchant
            if (re.match(r'^\d', candidate) and not re.search(r'[a-z]', candidate, re.I)) or \
               any(sym in candidate.lower() for sym in ['rs', 'inr', '₹', 'bal', 'avbl']):
                continue
            stop_words = [
                'on', 'at', 'from', 'via', 'towards', 'using', 'successful', 
                'for', 'a/c', 'account', 'ref', 'available', 'avbl', 'bal', 
                'is', 'has', 'in', 'using', 'google', 'pay', 'gpay', 'upi',
                'phonepe', 'paytm', 'transaction', 'refno'
            ]
            
            words = candidate.split()
            final_words = []
            for w in words:
                clean_w = w.rstrip('.,')
                if clean_w in stop_words:
                    break
                final_words.append(w)
            
            if final_words:
                merchant = " ".join(final_words).rstrip('.,')
                if merchant:
                    return merchant.title()

    # 2. Phone number 
    phone = re.search(r"\b\d{10}\b", t)
    if phone:
        return phone.group(0)

    # 3. UPI ID 
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
