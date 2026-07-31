-- =============================================================
-- FASE B — trancar as tabelas com dado pessoal
-- Crescidinhos Fotografia · 31/07/2026
--
-- Só rode DEPOIS de a branch seguranca-rls estar publicada (já está,
-- desde 31/07). O app novo não lê mais estas tabelas pelo navegador:
-- disponibilidade, cadastro por telefone e contrato passam pelo n8n.
--
-- DEPOIS DISTO, com a chave publicável do site:
--   clientes         → nada. Nem ler, nem escrever, nem apagar.
--   agendamentos     → só INSERIR (o site precisa criar o agendamento).
--   compromissos     → nada.
--   disponibilidades → nada.
--
-- O n8n usa service_role e ignora RLS: nenhuma automação muda.
-- =============================================================

-- Recria por garantia — a Fase A já criou.
create or replace function public.eh_fotografa()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'crescidinhosfoto@gmail.com';
$$;

-- A cliente logada na Área do Cliente enxerga só o que é dela.
-- O e-mail vem do crachá emitido pelo Supabase depois do código de
-- 6 dígitos, não do que o navegador afirma ser.
create or replace function public.email_do_cracha()
returns text language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '');
$$;


-- ─── clientes · 114 linhas com CPF, RG, endereço ───────────────────
drop policy if exists "acesso publico"      on public.clientes;
drop policy if exists "app_acesso_clientes" on public.clientes;
drop policy if exists "fotografa_total"     on public.clientes;
drop policy if exists "cliente_ve_o_proprio" on public.clientes;

create policy "fotografa_total" on public.clientes
  for all to authenticated
  using (public.eh_fotografa()) with check (public.eh_fotografa());

create policy "cliente_ve_o_proprio" on public.clientes
  for select to authenticated
  using (email = public.email_do_cracha());


-- ─── agendamentos ──────────────────────────────────────────────────
drop policy if exists "acesso publico"             on public.agendamentos;
drop policy if exists "acesso publico agendamentos" on public.agendamentos;
drop policy if exists "app_acesso_agendamentos"    on public.agendamentos;
drop policy if exists "fotografa_total"            on public.agendamentos;
drop policy if exists "cliente_ve_os_proprios"     on public.agendamentos;
drop policy if exists "site_pode_criar"            on public.agendamentos;

create policy "fotografa_total" on public.agendamentos
  for all to authenticated
  using (public.eh_fotografa()) with check (public.eh_fotografa());

create policy "cliente_ve_os_proprios" on public.agendamentos
  for select to authenticated
  using (cliente_id in (
    select id from public.clientes where email = public.email_do_cracha()
  ));

-- A única brecha que sobra para o site: criar agendamento novo.
-- Não permite ler, alterar nem apagar — no pior caso alguém cria
-- agendamento falso, que aparece na sua agenda e você exclui.
create policy "site_pode_criar" on public.agendamentos
  for insert to anon
  with check (true);


-- ─── compromissos · agenda pessoal da Thais ────────────────────────
drop policy if exists "public_access"   on public.compromissos;
drop policy if exists "fotografa_total" on public.compromissos;

create policy "fotografa_total" on public.compromissos
  for all to authenticated
  using (public.eh_fotografa()) with check (public.eh_fotografa());


-- ─── disponibilidades ──────────────────────────────────────────────
drop policy if exists "acesso publico disponibilidades"  on public.disponibilidades;
drop policy if exists "anon pode ler disponibilidades"   on public.disponibilidades;
drop policy if exists "app_acesso_disponibilidades"      on public.disponibilidades;
drop policy if exists "service pode tudo disponibilidades" on public.disponibilidades;
drop policy if exists "fotografa_total"                  on public.disponibilidades;

create policy "fotografa_total" on public.disponibilidades
  for all to authenticated
  using (public.eh_fotografa()) with check (public.eh_fotografa());


-- =============================================================
-- ⚠️ DOIS FLUXOS PARAM DE FUNCIONAR — os dois sem uso hoje
--
-- 1. RESGATE DE VALE PRESENTE
--    Precisa ler o vale pelo código e marcar como utilizado.
--    Hoje não existe nenhum vale vendido (0 no banco), então não
--    quebra nada em uso. Precisa virar webhook ANTES da primeira venda.
--    Bônus: a consulta atual usa ilike, então um curinga no lugar do
--    código listaria todos os vales ativos com nome de cliente.
--
-- 2. ASSINATURA DO COFRINHO
--    Precisa gravar os dados da assinatura no cadastro da cliente.
--    Ninguém assinou o Cofrinho até hoje. Some junto com a remoção
--    do Mercado Pago, que já estava na fila.
-- =============================================================


-- =============================================================
-- CONFERÊNCIA
-- =============================================================
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


-- =============================================================
-- COMO DESFAZER
--   alter table public.clientes         disable row level security;
--   alter table public.agendamentos     disable row level security;
--   alter table public.compromissos     disable row level security;
--   alter table public.disponibilidades disable row level security;
-- =============================================================
