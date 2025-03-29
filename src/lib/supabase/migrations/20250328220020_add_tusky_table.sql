-- Tuskyボールトテーブル
CREATE TABLE public.tusky_vaults (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  encrypted BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tuskyファイルテーブル
CREATE TABLE public.tusky_files (
  id UUID PRIMARY KEY,
  vault_id UUID NOT NULL REFERENCES public.tusky_vaults(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- NFTテーブル
CREATE TABLE public.nfts (
  id TEXT PRIMARY KEY,  -- SuiのObjectIDを直接IDとして使用
  file_id UUID NOT NULL REFERENCES public.tusky_files(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
