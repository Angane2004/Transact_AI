import sqlite3
import os

db_path = "d:/ghci/TransactAI/transactai.db"

if not os.path.exists(db_path):
    print(f"Error: Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Last 10 Transactions ---")
cursor.execute("SELECT id, user_id, raw_text, amount, predicted_category, created_at FROM transactions ORDER BY created_at DESC LIMIT 10")
rows = cursor.fetchall()
for row in rows:
    print(row)

print("\n--- Unique User IDs ---")
cursor.execute("SELECT DISTINCT user_id FROM transactions")
users = cursor.fetchall()
for user in users:
    print(user)

conn.close()
