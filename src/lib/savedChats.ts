import { supabase } from "@/integrations/supabase/client";

export type SavedMsg = { role: "user" | "assistant"; content: string };

export type SavedChat = {
  id: string;
  title: string;
  subject_id: string;
  subject_label: string;
  subject_emoji: string;
  subject_color: string;
  messages: SavedMsg[];
  created_at: string;
};

export const listSavedChats = async (): Promise<SavedChat[]> => {
  const { data, error } = await supabase
    .from("saved_chats")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    messages: Array.isArray(r.messages) ? r.messages : [],
  }));
};

export const saveChat = async (
  userId: string,
  chat: Omit<SavedChat, "id" | "created_at">
): Promise<SavedChat> => {
  const { data, error } = await supabase
    .from("saved_chats")
    .insert({
      user_id: userId,
      title: chat.title,
      subject_id: chat.subject_id,
      subject_label: chat.subject_label,
      subject_emoji: chat.subject_emoji,
      subject_color: chat.subject_color,
      messages: chat.messages as any,
    })
    .select("*")
    .single();
  if (error) throw error;
  return { ...(data as any), messages: chat.messages };
};

export const deleteSavedChat = async (id: string) => {
  const { error } = await supabase.from("saved_chats").delete().eq("id", id);
  if (error) throw error;
};