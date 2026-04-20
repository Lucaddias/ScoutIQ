# ScoutIQ — Guia de Integração com Supabase

## O que é o Supabase?

Supabase é um Backend-as-a-Service open source que entrega, num único serviço:
- **Banco de dados** PostgreSQL completo
- **Autenticação** (email/senha, OAuth, Magic Link)
- **API REST e realtime** gerada automaticamente
- **Storage** para arquivos e imagens

> [!NOTE]
> Para escalar o ScoutIQ para produção, o Supabase substitui o login falso e o JSON local por dados reais e autenticação segura — sem precisar configurar um servidor próprio.

---

## Passo 1 — Criar conta e projeto

1. Acesse [https://supabase.com](https://supabase.com) e clique em **Start your project**.
2. Faça login com GitHub.
3. Clique em **New Project**.
4. Preencha:
   - **Name**: `ScoutIQ`
   - **Database Password**: crie uma senha forte e anote-a
   - **Region**: `South America (São Paulo)`
5. Aguarde ~2 minutos enquanto o projeto é provisionado.

---

## Passo 2 — Instalar o client Supabase no projeto

```bash
cd /Users/lucadias/Downloads/ScoutIQ
npm install @supabase/supabase-js
```

---

## Passo 3 — Configurar as variáveis de ambiente

1. No painel do Supabase, vá em **Project Settings → API**.
2. Copie:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`

3. Crie o arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

4. Adicione `.env` ao `.gitignore` para não commitar as chaves.

---

## Passo 4 — Criar o cliente Supabase

Crie o arquivo `src/lib/supabase.js`:

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

---

## Passo 5 — Criar as tabelas no banco

No painel do Supabase, vá em **SQL Editor** e execute:

```sql
-- Tabela de atletas
create table athletes (
  id             text primary key,
  name           text not null,
  position       text,
  age            int,
  nationality    text,
  market_value   bigint,
  monthly_salary bigint,
  currency       text default 'BRL',
  team           text,
  image_url      text,
  goals          int default 0,
  assists        int default 0,
  games_played   int default 0,
  minutes_played int default 0,
  pass_accuracy  numeric(5,2),
  tackles        int default 0,
  distance_km    numeric(8,2),
  created_at     timestamptz default now()
);

-- Ativar Row Level Security
alter table athletes enable row level security;

-- Política: qualquer usuário autenticado pode ler
create policy "Authenticated users can read athletes"
  on athletes for select
  to authenticated
  using (true);
```

---

## Passo 6 — Importar os dados do JSON para o banco

Crie um script temporário `scripts/seed.js`:

```js
import { createClient } from '@supabase/supabase-js'
import data from '../src/data/players_updated.json' assert { type: 'json' }

const supabase = createClient(
  'https://SEU-PROJETO.supabase.co',
  'SUA-SERVICE-ROLE-KEY'  // use a service_role key para seeds, nunca no frontend
)

const rows = data.athletes.map(p => ({
  id:             p.id,
  name:           p.name,
  position:       p.position,
  age:            p.age,
  nationality:    p.nationality,
  market_value:   p.marketValue,
  monthly_salary: p.monthlySalary,
  currency:       p.currency,
  team:           p.team,
  image_url:      p.profileImageURL,
  goals:          p.statistics?.goals ?? 0,
  assists:        p.statistics?.assists ?? 0,
  games_played:   p.statistics?.gamesPlayed ?? 0,
  minutes_played: p.statistics?.minutesPlayed ?? 0,
  pass_accuracy:  p.statistics?.totalPasses > 0
    ? (p.statistics.accuratePasses / p.statistics.totalPasses) * 100
    : null,
  tackles:        p.statistics?.tackles ?? 0,
  distance_km:    p.statistics?.distanceCoveredKm ?? 0,
}))

const { error } = await supabase.from('athletes').upsert(rows)
if (error) console.error(error)
else console.log(`✅ ${rows.length} atletas importados!`)
```

Execute uma vez:
```bash
node scripts/seed.js
```

---

## Passo 7 — Substituir o login por autenticação real

Substitua o `handleSubmit` do `Login/index.jsx`:

```jsx
import { supabase } from '../../lib/supabase.js'

const handleSubmit = async (e) => {
  e.preventDefault()
  setLoading(true)
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  setLoading(false)
  if (error) {
    setError('Email ou senha incorretos.')
    return
  }
  onNavigate('dashboard')
}
```

Para criar o primeiro usuário, vá em **Authentication → Users** no painel do Supabase e clique em **Add user**.

---

## Passo 8 — Carregar atletas do banco (opcional)

Em vez de importar o JSON, busque do banco:

```jsx
import { supabase } from '../../lib/supabase.js'
import { useEffect, useState } from 'react'

const [players, setPlayers] = useState([])

useEffect(() => {
  supabase.from('athletes').select('*')
    .then(({ data }) => setPlayers(enrichPlayers(data ?? [])))
}, [])
```

---

## Resumo dos próximos passos

| Etapa | O que faz |
|-------|-----------|
| `npm install @supabase/supabase-js` | Instala o client |
| Criar projeto no Supabase | Provisiona banco + auth + API |
| Criar tabela `athletes` + RLS | Estrutura e segurança dos dados |
| `node scripts/seed.js` | Importa os 346 atletas para o banco |
| Substituir login no frontend | Autenticação real com email/senha |
| (Opcional) Buscar atletas do banco | Dados sempre atualizados via API |

> [!TIP]
> Quando tiver múltiplos usuários ou precisar de permissões por clube, adicione uma tabela `clubs` e `profiles` e refine as RLS policies. O Supabase tem documentação excelente em [supabase.com/docs](https://supabase.com/docs).
