import sys
import os

# Add api to path
sys.path.append(os.path.join(os.getcwd(), 'api'))

from core.agents.parser_agent import ParserAgent

def test_local_parse():
    print("Testing ParserAgent in Local Fallback mode (No API Key)...")
    
    # Ensure no API key is set for this test
    os.environ["GEMINI_API_KEY"] = ""
    
    agent = ParserAgent()
    
    test_sms = "Your A/c XX5432 is debited for Rs.2,130.00 on 21-MAR-26. Info- UPI/423876543/Swiggy. Avl Bal- Rs.14,320.50"
    
    print(f"Input SMS: {test_sms}")
    result = agent.parse(test_sms)
    
    if result:
        print("\n✅ Extraction Success!")
        print(f"Amount: {result.amount}")
        print(f"Type: {result.type}")
        print(f"Account: {result.account_last4}")
        print(f"Merchant: {result.merchant}")
        print(f"UPI Ref: {result.upi_ref}")
        print(f"Date: {result.date}")
    else:
        print("\n❌ Extraction Failed.")

if __name__ == "__main__":
    test_local_parse()
