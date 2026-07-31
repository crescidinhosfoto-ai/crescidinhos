-- =============================================================
-- Fecha a última brecha + destranca o que o painel usa
-- Crescidinhos Fotografia · 31/07/2026
--
-- Rode inteiro. São duas coisas independentes.
-- =============================================================


-- ─── 1. A chave publicável perde o último acesso que tinha ─────────
--
-- A Fase B deixou "site_pode_criar" liberando INSERT em agendamentos,
-- porque o site criava o agendamento direto. Agora a criação passa pelo
-- webhook agendamento-criar (n8n, service_role), então essa brecha não
-- é mais necessária.
--
-- Depois disto, a chave que vai dentro do site não faz absolutamente
-- nada no banco: nem ler, nem criar, nem alterar, nem apagar.

drop policy if exists "site_pode_criar" on public.agendamentos;


-- ─── 2. conversas, tarefas e galerias ──────────────────────────────
--
-- Ficaram para depois da publicação porque o painel antigo as lia com a
-- chave publicável. O app novo já está no ar e usa o crachá, então agora
-- dá para trancar.

drop policy if exists "anon_select_conversas" on public.conversas;
drop policy if exists "anon_insert_conversas" on public.conversas;
drop policy if exists "anon_update_conversas" on public.conversas;
drop policy if exists "fotografa_total"       on public.conversas;
create policy "fotografa_total" on public.conversas
  for all to authenticated
  using (public.eh_fotografa()) with check (public.eh_fotografa());

drop policy if exists "anon_select_tarefas" on public.tarefas;
drop policy if exists "anon_update_tarefas" on public.tarefas;
drop policy if exists "fotografa_total"     on public.tarefas;
create policy "fotografa_total" on public.tarefas
  for all to authenticated
  using (public.eh_fotografa()) with check (public.eh_fotografa());

drop policy if exists "app_acesso_galerias" on public.galerias;
drop policy if exists "fotografa_total"     on public.galerias;
create policy "fotografa_total" on public.galerias
  for all to authenticated
  using (public.eh_fotografa()) with check (public.eh_fotografa());


-- ─── Conferência ───────────────────────────────────────────────────
select c.relname as tabela,
       string_agg(p.polname || ' [' ||
         coalesce(array_to_string(array(
           select rolname from pg_roles where oid = any(p.polroles)), ','), 'TODOS') ||
         ']', ' | ' order by p.polname) as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
group by c.relname having count(p.polname) > 0
order by c.relname;
