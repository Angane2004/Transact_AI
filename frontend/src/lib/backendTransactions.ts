import { api } from "@/lib/api";

/** Maps GET /transactions rows to the shape used by dashboard lists. */
export async function fetchTransactionsFromApi(): Promise<any[]> {
  try {
    const res = await api.get("/transactions", { params: { limit: 500 } });
    const rows = res.data?.results ?? [];
    return rows.map((r: any) => ({
      id: r.id,
      description: r.raw_text,
      amount: r.amount ?? 0,
      category: r.category,
      predicted_category: r.category,
      date: r.timestamp,
      txn_time: r.timestamp,
      receiver: r.receiver,
      recipient: r.receiver,
      receiver_name: r.receiver,
      raw_text: r.raw_text,
      type: "debit" as const,
      status: "completed" as const,
    }));
  } catch {
    return [];
  }
}

/** Prefer API rows when both lists contain the same id (e.g. after paste-save). */
export function mergeTransactionLists(firestoreOrLocal: any[], apiList: any[]): any[] {
  const map = new Map<string, any>();
  for (const t of firestoreOrLocal) {
    if (t?.id != null) map.set(String(t.id), t);
  }
  for (const t of apiList) {
    if (t?.id != null) map.set(String(t.id), t);
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.txn_time || b.date).getTime() - new Date(a.txn_time || a.date).getTime()
  );
}
