# ScoutIQ — Inteligência em Recrutamento Esportivo

**ScoutIQ** é uma plataforma moderna de análise de desempenho e recrutamento para clubes de futebol. A aplicação permite a simulação de cenários de compra de atletas sob restrições financeiras e salariais, monitoramento de desempenho e auditoria estatística.

---

## 🚀 Tecnologias Utilizadas

- **Frontend**: React (Vite, CSS Modules/Vanilla CSS, Bootstrap 5.2)
- **Gerenciamento de Estado**: Redux Toolkit (Slices, Entity Adapters)
- **Persistência & Autenticação**: Supabase Auth (com fallback local para testes rápidos)
- **Mock DB**: JSON-Server para simular o banco de dados localmente (port 3001)

---

## 🛠️ Como Executar o Projeto

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Execute o servidor de desenvolvimento e o JSON-Server concorrentemente:
   ```bash
   npm run dev
   ```
   *Este comando iniciará o Vite (geralmente em http://localhost:5173) e o JSON-Server na porta 3001.*

---

## 📖 Geração da Documentação (JSDoc)

Esta base de código está totalmente comentada utilizando o padrão **JSDoc**. O motor de documentação está configurado com o tema responsivo **docdash** para uma experiência profissional de navegação.

### Gerar os Arquivos HTML:
Para criar ou atualizar a documentação automática em formato HTML, execute:
```bash
npm run docs
```

Após a execução, os arquivos HTML estáticos estarão disponíveis no diretório `./docs/`.

### Como Visualizar:
Basta abrir o arquivo `./docs/index.html` em qualquer navegador da web para consultar a documentação completa dos módulos, componentes, funções utilitárias e gerenciamento de estado Redux.
