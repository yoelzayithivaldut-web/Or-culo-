# ORÁCULO - CRM Inteligente para Escritores

Este projeto é um CRM completo para escritores e editoras, integrando o poder do **Supabase** (banco de dados e autenticação) com a **IA Gemini** (assistência na escrita e revisão editorial).

## 🚀 Tecnologias Utilizadas
- **Framework**: Next.js 15+ (App Router)
- **Estilização**: Tailwind CSS 4.0
- **Backend**: Supabase (PostgreSQL + Auth)
- **IA**: Google Gemini API (Modelos 3.0 Flash e Pro)
- **Animações**: Motion (Framer Motion)
- **Banco de Dados**: PostgreSQL (via Supabase)

## 🔄 Sincronização e Desenvolvimento

### 1. Sincronizar com GitHub
No AI Studio Build, você pode exportar seu código diretamente para o GitHub:
1. Clique no ícone de **Configurações (Settings)** no canto superior direito.
2. Selecione **Export to GitHub**.
3. Conecte sua conta e escolha um repositório. Isso enviará todo o código do Oráculo para o GitHub.

### 2. Rodar Localmente
Para rodar o projeto no seu computador:
1. Clone o repositório do GitHub: `git clone <url-do-seu-repositorio>`
2. Entre na pasta: `cd oraculo`
3. Instale as dependências: `npm install`
4. Configure as variáveis de ambiente:
   - Crie um arquivo `.env.local` na raiz do projeto.
   - Copie o conteúdo do `.env.example` e preencha com suas chaves reais.
5. Inicie o servidor de desenvolvimento: `npm run dev`
6. O Oráculo estará disponível em `http://localhost:3000`.

### 3. Configuração do Supabase
O Oráculo já está configurado para usar o Supabase. Para que o banco de dados funcione localmente, você deve aplicar a migração:
1. Copie o conteúdo de `supabase_migration.sql`.
2. No painel do Supabase, vá em **SQL Editor** e execute o script.
3. Certifique-se de que as chaves `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` estão no seu `.env.local`.

## 🛠️ Scripts Disponíveis
- `npm run dev`: Inicia o servidor de desenvolvimento.
- `npm run build`: Cria a versão de produção do aplicativo.
- `npm run start`: Inicia o servidor de produção.
- `npm run lint`: Executa a verificação de erros no código.

---
Desenvolvido com ❤️ para a comunidade literária.
