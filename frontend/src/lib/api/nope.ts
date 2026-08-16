import { http } from "@/lib/api/http";
import { nopeSchema, type CreateNope, type Nope } from "@/lib/schemas";

export async function fetchNopes(): Promise<Nope[]> {
  const { data } = await http.get("/nope");
  return nopeSchema.array().parse(data);
}

export async function fetchTopNopes(limit: number): Promise<Nope[]> {
  const { data } = await http.get("/nope", { params: { sort: "top", limit } });
  return nopeSchema.array().parse(data);
}

export async function createNope(payload: CreateNope): Promise<Nope> {
  const { data } = await http.post("/nope", payload);
  return nopeSchema.parse(data);
}

export async function deleteNope(id: number): Promise<void> {
  await http.delete(`/nope/${id}`);
}

export async function clearNopes(): Promise<void> {
  await http.delete("/nope");
}

export async function reactToNope(id: number): Promise<Nope> {
  const { data } = await http.post(`/nope/${id}/react`);
  return nopeSchema.parse(data);
}
