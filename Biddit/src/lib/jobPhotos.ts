import { supabase } from "./supabaseClient";

export async function uploadJobPhoto(args: { jobId: string; file: File }) {
  const { jobId, file } = args;

  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
  const path = `${jobId}/${crypto.randomUUID()}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from("job-photos")
    .upload(path, file, { upsert: false });

  if (upErr) throw upErr;

  const { error: dbErr } = await supabase.from("job_photos").insert({
    job_id: jobId,
    storage_path: path,
  });

  if (dbErr) throw dbErr;

  return path;
}

export function getJobPhotoUrl(path: string) {
  const { data } = supabase.storage.from("job-photos").getPublicUrl(path);
  return data.publicUrl;
}
