-- Create storage buckets for audio recordings, transcriptions, and metadata
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('audio-recordings', 'audio-recordings', true),
  ('transcriptions', 'transcriptions', true),
  ('metadata', 'metadata', true);

-- Create policies for public access to all buckets
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (true);
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (true);
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (true);

-- Update audio_recordings table to include storage paths
ALTER TABLE public.audio_recordings 
ADD COLUMN storage_path TEXT,
ADD COLUMN metadata_storage_path TEXT;

-- Update transcriptions table to include storage path
ALTER TABLE public.transcriptions 
ADD COLUMN transcript_storage_path TEXT;