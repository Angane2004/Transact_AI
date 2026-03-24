import { api } from "@/lib/api";

/** Maps GET /transactions rows to the shape used by dashboard lists. */
export async function fetchTransactionsFromApi(): Promise<any[]> {
  try {
    const res = await api.get("/transactions", { params: { limit: 1000 }, timeout: 120000 });
    const rows = res.data?.results ?? [];
    return rows.map((r: any) => ({
      id: r.id,
      description: r.raw_text,
      amount: r.amount ?? 0,
      category: r.category || r.predicted_category || "Others",
      predicted_category: r.predicted_category || r.category || "Others",
      date: r.timestamp || r.txn_time,
      txn_time: r.timestamp,
      receiver: r.receiver,
      recipient: r.receiver,
      receiver_name: r.receiver,
      raw_text: r.raw_text,
      type: r.type || "debit",
      status: "completed" as const,
    }));
  } catch {
    return [];
  }
}

/** 
 * Merges transactions from Firestore, Backend API, and Local Storage.
 * Local transactions are prioritized if they are 'pending' or 'offline'.
 */
export function mergeTransactionLists(listA: any[], listB: any[], listC: any[] = []): any[] {
  const map = new Map<string, any>();
  
  // Combine all lists
  const all = [...listA, ...listB, ...listC];
  
  for (const t of all) {
    if (!t || t.id == null) continue;
    const id = String(t.id);
    
    // If we already have this ID, decide which one to keep
    if (map.has(id)) {
        const existing = map.get(id);
        // Keep the one with more data or better status
        if (existing.status === 'pending' && t.status === 'completed') {
            map.set(id, t);
        } else if (existing.status === 'completed' && t.status === 'pending') {
            // keep existing completed
        } else {
            // default to latest one in the loop
            map.set(id, t);
        }
    } else {
        map.set(id, t);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.txn_time || b.date).getTime() - new Date(a.txn_time || a.date).getTime()
  );
}
