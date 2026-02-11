import { supabase } from "./supabaseClient";

export async function uploadProviderDoc(args: {
  userId: string;
  file: File;
  kind: "license" | "insurance" | "id" | "other";
}) {
  const { userId, file, kind } = args;

  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from("provider-docs")
    .upload(path, file, { upsert: false });

  if (upErr) throw upErr;

  const { error: dbErr } = await supabase.from("provider_documents").insert({
    user_id: userId,
    kind,
    storage_bucket: "provider-docs",
    storage_path: path,
    original_filename: file.name,
  });

  if (dbErr) throw dbErr;

  return path;
}

export async function createSignedDocUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("provider-docs")
    .createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}
