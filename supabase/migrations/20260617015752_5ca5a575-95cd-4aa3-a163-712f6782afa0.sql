
-- Add missing UPDATE policy for practice_tests
CREATE POLICY "pt update own" ON public.practice_tests
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add missing UPDATE policy for rank_history
CREATE POLICY "rh update own" ON public.rank_history
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add missing INSERT policy for season_results
CREATE POLICY "Users can insert their own season results" ON public.season_results
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Restrict broad listing on avatars bucket: replace public SELECT with owner-scoped listing.
-- Public file URLs continue to work because the bucket is public (served via Storage CDN, not RLS).
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
CREATE POLICY "Users can list their own avatar folder" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
