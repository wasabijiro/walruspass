.PHONY: supabase-login
supabase-login:
	supabase login

.PHONY: supabase-start
supabase-start:
	supabase start

.PHONY: supabase-stop
supabase-stop:
	supabase stop --no-backup

.PHONY: supabase-reset
supabase-reset:
	supabase db reset

.PHONY: supabase-migration-new
supabase-migration-new:
	@read -p "マイグレーション名を入力してください: " name; \
	supabase migration new $$name

.PHONY: supabase-pull
supabase-pull:
	supabase db pull

.PHONY: supabase-push
supabase-push:
	supabase db push

.PHONY: supabase-status
supabase-status:
	supabase status

.PHONY: supabase-migration-list
supabase-migration-list:
	supabase migration list

.PHONY: supabase-link
supabase-link:
	supabase link --project-ref
