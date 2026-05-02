CREATE TABLE public.ace_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ace_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ace own select" ON public.ace_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ace own insert" ON public.ace_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ace own delete" ON public.ace_messages FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX ace_messages_user_created_idx ON public.ace_messages (user_id, created_at DESC);