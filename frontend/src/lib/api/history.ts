import { http } from "@/lib/api/http";
import {
  historyItemSchema,
  type CreateHistoryItem,
  type HistoryItem,
} from "@/lib/schemas";

export async function fetchHistory(): Promise<HistoryItem[]> {
  const { data } = await http.get("/history");
  return historyItemSchema.array().parse(data);
}

export async function createHistoryItem(payload: CreateHistoryItem): Promise<HistoryItem> {
  const { data } = await http.post("/history", payload);
  return historyItemSchema.parse(data);
}

export async function deleteHistoryItem(id: number): Promise<void> {
  await http.delete(`/history/${id}`);
}

export async function clearHistory(): Promise<void> {
  await http.delete("/history");
}
