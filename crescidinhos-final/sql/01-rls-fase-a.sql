-- =============================================================
-- FASE A — trancar as tabelas internas
-- Crescidinhos Fotografia · 31/07/2026
--
-- Rode no SQL Editor do Supabase, logada como a dona do projeto.
--
-- O QUE ISTO FAZ
-- Liga o RLS (a tranca de permissão do Postgres). Depois disto, a chave
-- publicável do site — que vai dentro do código e qualquer um consegue —
-- deixa de ler e de apagar estas tabelas. Só a conta da fotógrafa passa.
--
-- O QUE ISTO **NÃO** QUEBRA
-- · O n8n usa a chave service_role, que ignora RLS por definição.
--   Clarice, lembretes, contratos e alertas seguem iguais.
-- · O agendamento público não toca nenhuma destas tabelas.
--
-- O ARQUIVO TEM DUAS PARTES. A ordem importa.
-- =============================================================

-- Quem é a dona. Sai do crachá assinado pelo Supabase, não do que o
-- navegador diz ser — não dá para forjar.
create or replace function public.eh_fotografa()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'crescidinhosfoto@gmail.com';
$$;


-- =============================================================
-- PARTE 1 — PODE RODAR AGORA
--
-- O app que está no ar hoje não lê nenhuma destas três tabelas.
-- Trancar agora não muda nada para você nem para as clientes.
-- É aqui que estão as 1021 mensagens trocadas com clientes.
-- =============================================================

-- ─── mensagens · 1021 linhas de conversa com clientes ──────────────
alter table public.mensagens enable row level security;
drop policy if exists "fotografa_total" on public.mensagens;
create policy "fotografa_total" on public.mensagens
  for all to authenticated
  using (public.eh_fotografa())
  with check (public.eh_fotografa());

-- ─── pausas · controla o silêncio da Clarice ───────────────────────
-- Quem escreve aqui é o n8n (service_role). O site nunca escreveu.
alter table public.pausas enable row level security;
drop policy if exists "fotografa_total" on public.pausas;
create policy "fotografa_total" on public.pausas
  for all to authenticated
  using (public.eh_fotografa())
  with check (public.eh_fotografa());

-- ─── configuracoes · espelho do catálogo para a Clarice ────────────
alter table public.configuracoes enable row level security;
drop policy if exists "fotografa_total" on public.configuracoes;
create policy "fotografa_total" on public.configuracoes
  for all to authenticated
  using (public.eh_fotografa())
  with check (public.eh_fotografa());


-- =============================================================
-- PARTE 2 — SÓ DEPOIS DE PUBLICAR A BRANCH seguranca-rls
--
-- Estas duas o Kanban lê. O app que está no ar hoje usa a chave
-- publicável, então trancar antes de publicar faz o Kanban aparecer
-- vazio. Nada é perdido — mas some da tela até você publicar.
--
-- Para rodar agora só a Parte 1, selecione com o mouse até aqui e
-- clique em Run. O SQL Editor roda só o trecho selecionado.
-- =============================================================

-- ─── conversas · funil do Kanban ───────────────────────────────────
alter table public.conversas enable row level security;
drop policy if exists "fotografa_total" on public.conversas;
create policy "fotografa_total" on public.conversas
  for all to authenticated
  using (public.eh_fotografa())
  with check (public.eh_fotografa());

-- ─── tarefas · geradas quando a conversa vira "fechado" ────────────
alter table public.tarefas enable row level security;
drop policy if exists "fotografa_total" on public.tarefas;
create policy "fotografa_total" on public.tarefas
  for all to authenticated
  using (public.eh_fotografa())
  with check (public.eh_fotografa());


-- =============================================================
-- CONFERÊNCIA — deve listar rls_ligado = true e 1 política em cada
-- =============================================================
select
  c.relname        as tabela,
  c.relrowsecurity as rls_ligado,
  count(p.polname) as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relname in ('mensagens','pausas','configuracoes','conversas','tarefas')
group by c.relname, c.relrowsecurity
order by c.relname;


-- =============================================================
-- COMO DESFAZER, se algo der errado
--   alter table public.mensagens     disable row level security;
--   alter table public.pausas        disable row level security;
--   alter table public.configuracoes disable row level security;
--   alter table public.conversas     disable row level security;
--   alter table public.tarefas       disable row level security;
-- =============================================================
