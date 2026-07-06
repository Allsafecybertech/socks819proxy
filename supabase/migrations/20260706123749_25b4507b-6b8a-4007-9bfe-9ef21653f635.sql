
CREATE POLICY "user upload screenshots" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "user read own screenshots" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='screenshots' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "user upload avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "user update avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "read avatars" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='avatars');
