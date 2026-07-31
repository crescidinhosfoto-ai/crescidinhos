-- =============================================================
-- FASE A (corrigida) — apagar as políticas que liberam geral
-- Crescidinhos Fotografia · 31/07/2026
--
-- POR QUE ESTE ARQUIVO EXISTE
-- O RLS já estava ligado. O problema não era a tranca desligada, e sim
-- políticas antigas que liberam tudo para qualquer um. Várias se chamam
-- "service pode ler" / "service pode tudo", mas foram criadas sem
-- indicar o papel — e política sem papel vale para TODO MUNDO, inclusive
-- a chave publicável que vai dentro do site.
--
-- POR QUE APAGAR NÃO QUEBRA O n8n
-- O service_role ignora RLS por definição do Postgres. Essas políticas
-- nunca foram necessárias para as automações — elas só abriam a porta
-- para o resto do mundo junto.
--
-- Rode no SQL Editor do Supabase.
-- =============================================================


-- =============================================================
-- PARTE 1 — PODE RODAR AGORA
--
-- Conferido no código: o app não lê nem escreve nenhuma destas três.
-- Quem usa é só o n8n, via service_role. Aqui estão as 1021 mensagens
-- trocadas com clientes.
-- =============================================================

-- ─── mensagens ─────────────────────────────────────────────────────
drop policy if exists "service pode ler"     on public.mensagens;
drop policy if exists "service pode inserir" on public.mensagens;

-- ─── pausas ────────────────────────────────────────────────────────
drop policy if exists "app_acesso_pausas" on public.pausas;
drop policy if exists "service pode tudo" on public.pausas;

-- ─── followups ─────────────────────────────────────────────────────
drop policy if exists "service pode tudo" on public.followups;
drop policy if exists "fotografa_total"   on public.followups;
create policy "fotografa_total" on public.followups
  for all to authenticated
  using (public.eh_fotografa())
  with check (public.eh_fotografa());


-- =============================================================
-- PARTE 2 — SÓ DEPOIS DE PUBLICAR A BRANCH seguranca-rls
--
-- Estas três o painel lê, e o app que está no ar hoje usa a chave
-- publicável. Trancar antes de publicar faz o Kanban e a galeria
-- aparecerem vazios até a publicação. Nada é perdido.
-- =============================================================

-- ─── conversas · funil do Kanban ───────────────────────────────────
drop policy if exists "anon_select_conversas" on public.conversas;
drop policy if exists "anon_insert_conversas" on public.conversas;
drop policy if exists "anon_update_conversas" on public.conversas;
drop policy if exists "fotografa_total"       on public.conversas;
create policy "fotografa_total" on public.conversas
  for all to authenticated
  using (public.eh_fotografa())
  with check (public.eh_fotografa());

-- ─── tarefas ───────────────────────────────────────────────────────
drop policy if exists "anon_select_tarefas" on public.tarefas;
drop policy if exists "anon_update_tarefas" on public.tarefas;

-- ─── galerias ──────────────────────────────────────────────────────
drop policy if exists "app_acesso_galerias" on public.galerias;
drop policy if exists "fotografa_total"     on public.galerias;
create policy "fotografa_total" on public.galerias
  for all to authenticated
  using (public.eh_fotografa())
  with check (public.eh_fotografa());


-- =============================================================
-- NÃO ESTÁ AQUI, DE PROPÓSITO
--
-- clientes, agendamentos, compromissos e disponibilidades continuam
-- abertas. O fluxo público de agendamento lê as quatro: ele busca a
-- cliente pelo telefone e calcula horários livres lendo a agenda.
-- Trancar hoje derruba o agendamento.
--
-- São elas que guardam o CPF. Entram na Fase B, junto com a mudança
-- que move essas leituras para webhook.
-- =============================================================


-- =============================================================
-- CONFERÊNCIA — rode depois e confira
-- Deve sobrar só "fotografa_total [authenticated]" nas tratadas.
-- =============================================================
select c.relname as tabela,
       string_agg(p.polname || ' [' ||
         coalesce(array_to_string(array(
           select rolname from pg_roles where oid = any(p.polroles)), ','), '') ||
         ']', ' | ' order by p.polname) as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
group by c.relname
having count(p.polname) > 0
order by c.relname;
