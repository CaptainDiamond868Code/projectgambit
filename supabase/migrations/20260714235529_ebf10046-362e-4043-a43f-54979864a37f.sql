
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles readable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Trigger to create profile on new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NULLIF(NEW.raw_user_meta_data->>'username', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Saved games
CREATE TABLE public.saved_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pgn TEXT NOT NULL,
  player_color TEXT NOT NULL CHECK (player_color IN ('white','black')),
  result TEXT,
  accuracy NUMERIC,
  avg_cp_loss NUMERIC,
  move_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  estimated_rating_low INT,
  estimated_rating_high INT,
  opening TEXT,
  coaching_report JSONB,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_games TO authenticated;
GRANT ALL ON public.saved_games TO service_role;
ALTER TABLE public.saved_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own games" ON public.saved_games
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own games" ON public.saved_games
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own games" ON public.saved_games
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own games" ON public.saved_games
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_saved_games_user_analyzed ON public.saved_games (user_id, analyzed_at DESC);
