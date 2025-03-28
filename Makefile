SUPABASE_DIR := src/lib/supabase

.PHONY: supabase-start
supabase-start:
	$(MAKE) -C $(SUPABASE_DIR) supabase-start

.PHONY: supabase-stop
supabase-stop:
	$(MAKE) -C $(SUPABASE_DIR) supabase-stop

.PHONY: supabase-reset
supabase-reset:
	$(MAKE) -C $(SUPABASE_DIR) supabase-reset

.PHONY: supabase-migration-new
supabase-migration-new:
	$(MAKE) -C $(SUPABASE_DIR) supabase-migration-new

.PHONY: supabase-pull
supabase-pull:
	$(MAKE) -C $(SUPABASE_DIR) supabase-pull

.PHONY: supabase-push
supabase-push:
	$(MAKE) -C $(SUPABASE_DIR) supabase-push

.PHONY: supabase-status
supabase-status:
	$(MAKE) -C $(SUPABASE_DIR) supabase-status

.PHONY: supabase-migration-list
supabase-migration-list:
	$(MAKE) -C $(SUPABASE_DIR) supabase-migration-list

.PHONY: supabase-link
supabase-link:
	$(MAKE) -C $(SUPABASE_DIR) supabase-link

.PHONY: supabase-reset-push
supabase-reset-push:
	$(MAKE) supabase-reset
	$(MAKE) supabase-push
