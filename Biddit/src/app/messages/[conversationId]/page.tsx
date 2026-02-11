"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function MessagesPage({ params }: { params: { conversationId: string } }) {
  const conversationId = params.conversationId;
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setUserId(u.user?.id ?? null);

      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      setMessages((data as any) ?? []);

      const channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
          (payload) => setMessages((m) => [...m, payload.new])
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    })();
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    const text = body.trim();
    if (!text) return;

    setBody("");
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      body: text,
    });
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Messages</h1>

      <div className="mt-4 h-[60vh] overflow-auto rounded-2xl border p-4 space-y-3 bg-slate-50">
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-slate-900 text-white" : "bg-white border"}`}>
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="mt-4 flex gap-2">
        <input className="flex-1 rounded-xl border px-4 py-3" placeholder="Type a message…" value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="rounded-xl bg-slate-900 px-4 py-3 text-white hover:bg-slate-800">Send</button>
      </form>
    </div>
  );
}
