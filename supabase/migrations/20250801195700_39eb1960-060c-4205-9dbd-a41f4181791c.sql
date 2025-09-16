-- Create profiles table (instead of separate users table)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Create audio_recordings table
CREATE TABLE public.audio_recordings (
    audio_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    upload_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'transcribed', 'error')),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create transcriptions table
CREATE TABLE public.transcriptions (
    transcription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audio_id UUID NOT NULL UNIQUE REFERENCES public.audio_recordings(audio_id) ON DELETE CASCADE,
    transcribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    location TEXT,
    role TEXT,
    no_of_speakers INTEGER,
    type TEXT
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for audio_recordings
CREATE POLICY "Users can view their own recordings" ON public.audio_recordings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recordings" ON public.audio_recordings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings" ON public.audio_recordings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings" ON public.audio_recordings
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for transcriptions
CREATE POLICY "Users can view transcriptions of their recordings" ON public.transcriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.audio_recordings 
            WHERE audio_recordings.audio_id = transcriptions.audio_id 
            AND audio_recordings.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert transcriptions for their recordings" ON public.transcriptions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.audio_recordings 
            WHERE audio_recordings.audio_id = transcriptions.audio_id 
            AND audio_recordings.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update transcriptions of their recordings" ON public.transcriptions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.audio_recordings 
            WHERE audio_recordings.audio_id = transcriptions.audio_id 
            AND audio_recordings.user_id = auth.uid()
        )
    );

-- Create trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, created_at)
    VALUES (NEW.id, NEW.email, NEW.created_at);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();