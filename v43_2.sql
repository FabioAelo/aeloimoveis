-- V43.2 — Permissões do analytics anônimo
-- Corrige o acesso de gravação do site e leitura do painel administrativo.

grant insert on table public.site_events to anon, authenticated;
grant select on table public.site_events to authenticated;
