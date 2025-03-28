// Supabase configuration
export const SUPABASE_CONFIG = {
  // Supabase project configuration
  PROJECT: {
    URL: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  },
}
