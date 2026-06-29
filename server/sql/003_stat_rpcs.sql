-- ============================================================================
-- Migração 003 — Funções atômicas para sincronizar estatísticas do atleta
-- ----------------------------------------------------------------------------
-- O acumulado em `athletes.statistics` era atualizado com read-modify-write em
-- JS, o que abria uma race condition (lost update) sob concorrência. Estas
-- funções fazem a leitura+escrita em UMA operação no banco, eliminando a corrida.
--
-- São aditivas (CREATE OR REPLACE FUNCTION) — não alteram dados existentes.
-- ============================================================================

BEGIN;

-- Incrementa (ou decrementa) UMA estatística, nunca deixando o valor negativo.
CREATE OR REPLACE FUNCTION public.increment_stat(p_id text, p_key text, p_delta numeric)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.athletes
  SET statistics = jsonb_set(
        COALESCE(statistics, '{}'::jsonb),
        ARRAY[p_key],
        to_jsonb(GREATEST(0, COALESCE((statistics->>p_key)::numeric, 0) + p_delta))
      )
  WHERE id = p_id;
$$;

-- Define UMA estatística para um valor absoluto (usado no ajuste manual).
CREATE OR REPLACE FUNCTION public.set_stat(p_id text, p_key text, p_value numeric)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.athletes
  SET statistics = jsonb_set(
        COALESCE(statistics, '{}'::jsonb),
        ARRAY[p_key],
        to_jsonb(GREATEST(0, p_value))
      )
  WHERE id = p_id;
$$;

-- Aplica vários deltas de uma vez (lote), em uma única transação implícita.
CREATE OR REPLACE FUNCTION public.increment_stats(p_id text, p_deltas jsonb)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  k text;
  v numeric;
BEGIN
  FOR k, v IN SELECT key, value::numeric FROM jsonb_each_text(p_deltas) LOOP
    UPDATE public.athletes
    SET statistics = jsonb_set(
          COALESCE(statistics, '{}'::jsonb),
          ARRAY[k],
          to_jsonb(GREATEST(0, COALESCE((statistics->>k)::numeric, 0) + v))
        )
    WHERE id = p_id;
  END LOOP;
END;
$$;

COMMIT;
