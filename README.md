# 📚 Planner Pro Docente

> **Plataforma WebApp PWA Offline-First de Gestão Pedagógica e Criação de Materiais Educacionais**

[![Vanilla JS](https://img.shields.io/badge/Stack-Vanilla%20JS%20(ES6%2B)-yellow.svg)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
[![Architecture](https://img.shields.io/badge/Architecture-MVC%20Propriet%C3%A1rio-blue.svg)](#arquitetura-e-padronização-mvc)
[![PWA](https://img.shields.io/badge/PWA-Offline--First-green.svg)](#arquitetura-e-padronização-mvc)
[![Firebase](https://img.shields.io/badge/Backend-Google%20Firebase%20%2F%20Firestore-orange.svg)](https://firebase.google.com/)
[![KaTeX](https://img.shields.io/badge/Math-KaTeX%20CDN-purple.svg)](https://katex.org/)

O **Planner Pro Docente** é uma aplicação web progressiva (PWA) de alto desempenho projetada para auxiliar professores e instituições de ensino no planejamento pedagógico, gestão de turmas, avaliação contínua, criação automatizada de materiais didáticos (com auxílio de Inteligência Artificial) e editoria visual em nível mestre tipo Microsoft Word.

---

## 📋 Sumário
- [Visão Geral](#-visão-geral)
- [Diretrizes de Arquitetura & Proibições Estritas](#-diretrizes-de-arquitetura--proibições-estritas)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Editor Visual WYSIWYG Estilo Word](#-editor-visual-wysiwyg-estilo-word)
- [Segurança & Performance](#-segurança--performance)
- [Como Executar o Projeto](#-como-executar-o-projeto)
- [Plano de Manutenção & Evolução](#-plano-de-manutenção--evolução)

---

## 🌟 Visão Geral

O Planner Pro Docente centraliza todo o fluxo de trabalho do professor em um único ambiente rápido, moderno e funcional tanto online quanto offline:
- **Gestão de Turmas e Alunos:** Diário de classe, notas, frequências, pareceres descritivos e registro de ocorrências.
- **Planejamento Pedagógico & BNCC:** Alinhamento com as habilidades da Base Nacional Comum Curricular, bimestralização e sequências didáticas.
- **Criação e Gerador de Materiais:** Criação manual ou com Inteligência Artificial de avaliações, listas de exercícios, quizzes interativos, mapas mentais, flashcards e dinâmicas de grupo.
- **Estúdio de Edição Mestre:** Editor visual rico estilo Microsoft Word em folha A4 com renderização em tempo real de matemática (KaTeX), upload de imagens, cores customizadas de texto/fundo e metadados organizacionais.
- **Biblioteca & Comunidade:** Armazenamento local e nuvem no Google Firestore, com compartilhamento no acervo da comunidade docente.

---

## 🚫 Diretrizes de Arquitetura & Proibições Estritas

A arquitetura do **Planner Pro Docente** foi desenvolvida para ser extremamente leve, sustentável e independente de frameworks pesados ou gerenciadores de pacotes.

### ⚠️ Proibições Rigorosas
- **NENHUM Gerenciador de Pacotes:** É estritamente proibido o uso de `npm`, `yarn`, `pnpm` ou scripts de build baseados em Node.js.
- **NENHUM Framework Frontend/Backend:** É estritamente proibido React, Vue, Angular, Svelte, Next.js, Express, etc.
- **NENHUMA Biblioteca CSS Externa:** É estritamente proibido TailwindCSS, Bootstrap, Bulma ou Foundation. Todo o design é construído com CSS3 Vanilla proprietário (`variables.css`, `base.css`, `layout.css`, `components.css`).

### 🔒 Exceções Permitidas
1. **Google Firebase SDK:** Importado via CDN/Módulos ES6 nativos no navegador para autenticação e banco de dados Firestore.
2. **KaTeX / MathJax:** Importados via CDN para renderização de fórmulas matemáticas e equações científicas.
3. **FontAwesome:** Importado via CDN para ícones de interface.

---

## 🛠️ Funcionalidades Principais

### 1. Editor Visual WYSIWYG Estilo Word em Folha A4
- **Interface Ribbon Unificada:** Barra de ferramentas organizada em duas linhas intuitivas com controles de tamanho de fonte, família tipográfica (Inter, Roboto, Outfit, Georgia, Monospace), estilos (**Negrito**, *Itálico*, <u>Sublinhado</u>, Listas, H2, H3).
- **Cores Customizadas:** Seletores interativos de **Cor da Fonte** (`foreColor`) e **Cor do Fundo** (`hiliteColor`), permitindo destacar trechos pedagógicos.
- **Limpeza de Estilos & Colar Limpo:** Botão `🧹 Limpar Estilos` para remover formatação de seleções e botão `📋 Colar Limpo` para colar texto da área de transferência purificado em parágrafos limpos.
- **Sanitização de Cola Externa (`Paste Handler`):** Interceptação inteligente de `Ctrl+V` que remove resíduos visíveis de MathJax/KaTeX externos (como `role="presentation" style="..."`) e fundos brancos parasitas copiados de sites como *Brasil Escola*, *Toda Matéria* e *SuperPro*, mantendo a cor verde original do Gabarito (`#f0fdf4`).

### 2. Matemática e Ciência com KaTeX Nativo
- Suporte a delimitações modernas em LaTeX: `\({equação}\)` para equações na mesma linha e `\[{equação}\]` para equações em bloco.
- Inserção com 1 clique de frações (`\frac{a}{b}`), raízes quadradas (`\sqrt{x}`), sobrescritos ($X^2$), subscritos ($X_i$) e símbolos matemáticos/científicos ($\neq$, $\times$, $\div$, $\alpha$, $\beta$, $\pi$, $\Delta$, $\theta$, $\infty$, $\pm$, $\approx$).

### 3. Upload de Imagens no Material
- Botão **`📷 + Imagem`** integrado às barras de ferramentas.
- Converte imagens locais via `FileReader` para Base64/DataURL nativo, renderizando tags `<img src="..." class="material-img">` redimensionáveis e salvando-as diretamente no documento do professor.

### 4. Edição de Metadados Organizacionais (Turma, Disciplina e BNCC)
- No modal de edição mestre, o professor pode visualizar e alterar em tempo real:
  - **Turma / Ano:** Seletor com anos do Ensino Fundamental, Ensino Médio e Educação Infantil, suportando turmas personalizadas (ex: *7º Ano B*).
  - **Disciplina / Componente:** Seletor abrangente de disciplinas (Língua Portuguesa, Matemática, Ciências, História, Geografia, Física, Química, etc.).
  - **Habilidade / Código BNCC:** Campo de entrada para códigos ou descrições BNCC (ex: `EF06MA01`).
- Todos os metadados são salvos no Firestore e sincronizam com a busca e os filtros da Biblioteca.

### 5. Exportação e Impressão Inteligente
- **Exportação para Microsoft Word (`.doc`):** Pipeline em `prepararHTMLParaExportacao()` que gera arquivos `.doc` limpos, sem tags quebradas ou vazamento de código de atributos.
- **Modo Impressão / PDF A4:** Alternância em 1 clique entre **Versão do Aluno** (com campo de identificação/data e sem gabarito) e **Versão do Professor** (com gabaritos e orientações pedagógicas destacadas).

---

## 📁 Estrutura do Projeto

```text
Planner_Pro/
├── index.html                  # Ponto de entrada HTML5 principal (SPA)
├── css/
│   ├── variables.css           # Tokens de design, cores HSL/HEX e tipografia
│   ├── base.css                # Reset CSS e estilos fundamentais
│   ├── layout.css              # Grid system, containers e estrutura responsiva
│   └── components.css          # Estilos de cards, botões, modais, formulários e badges
├── js/
│   ├── app.js                  # Inicialização da SPA e registro de rotas
│   ├── controller.js           # Orquestrador central e gerenciador de modais
│   ├── router.js               # Roteamento por hash (#/biblioteca, #/criar-material)
│   ├── model.js                # Estado global reativo da aplicação e persistência
│   ├── reactive.js             # Engine de reatividade pub/sub simples
│   ├── firebase-service.js     # Integração com Firebase Auth e Cloud Firestore
│   ├── ai-service.js           # Conector da API de Inteligência Artificial
│   ├── utils.js                # Sanitizadores, formatadores KaTeX e helpers DOM
│   ├── components/
│   │   ├── toast.js            # Sistema de notificações Toast
│   │   ├── modal.js            # Gerenciador de diálogos modais
│   │   ├── filterBar.js        # Barra de filtros padronizada por Turma/Disciplina
│   │   └── card.js             # Componentes de card para listagem de materiais
│   └── views/
│       ├── criarMaterial.js    # View de criação de materiais, gerador IA e editor manual
│       ├── conteudoGerado.js   # Visualizador A4, estúdio de edição mestre e exportação Word
│       ├── comunidade.js       # Acervo comunitário de materiais pedagógicos
│       ├── planejamento.js     # Módulo de planejamentos e planos de aula BNCC
│       ├── turmaController.js  # Gestão de turmas e diário de classe
│       ├── provas.js           # Gerenciador de avaliações e banco de questões
│       ├── quizGestor.js       # Quizzes interativos e gamificação
│       ├── estudosVisuais.js   # Baralhos de Flashcards e Mapas Mentais
│       └── apresentacoes.js    # Apresentações de slides pedagógicos
└── README.md                   # Documentação oficial do projeto
```

---

## 🛡️ Segurança & Performance

### 🔒 Proteção Contra Vulnerabilidades XSS
Toda injeção de conteúdo dinâmico no DOM utiliza sanitização rigorosa:
- Textos Puros e Atributos: `escapeHTML(string)` converte caracteres especiais (`<`, `>`, `&`, `"`, `'`) em entidades HTML seguras.
- Conteúdos com Fórmulas e Formatação: `sanitizeComLatex(html)` permite apenas marcações pedagógicas autorizadas e estruturas do KaTeX, bloqueando scripts e manipuladores maliciosos (`onload`, `onerror`, `<script>`).

### ⚡ Otimização de Renderização (Vanilla DOM)
- **DocumentFragment:** Construção de listas e elementos repetitivos em memória antes da inserção no DOM para evitar *Layout Thrashing* e *Reflows* desnecessários.
- **EventDelegator (`data-action`):** Padrão de delegação de eventos centralizado no container raiz da aplicação, reduzindo event listeners avulsos no DOM.

---

## 🚀 Como Executar o Projeto

Como o projeto é construído exclusivamente com Vanilla HTML, CSS e JS nativos ES6+, ele não exige nenhuma instalação de dependências via Node.js ou compilação.

### Opção 1: Servidor Estático NBD (Python)
Abra o terminal na pasta raiz do projeto e execute:

```bash
# Python 3
python -m http.server 8000
```

Em seguida, acesse no navegador: `http://localhost:8000`

### Opção 2: Extensão Live Server (VS Code / Antigravity IDE)
1. Abra a pasta do projeto no seu editor.
2. Clique com o botão direito sobre o arquivo `index.html`.
3. Selecione **"Open with Live Server"**.

---

## 📝 Plano de Manutenção & Evolução

| Módulo | Status | Descrição Técnica |
| :--- | :---: | :--- |
| **Editor Visual Mestre** | ✅ Concluído | Suporte a `contenteditable`, KaTeX, upload de imagens, cores e limpeza de cola externa |
| **Organização Metadados** | ✅ Concluído | Edição em tempo real de Turma/Ano, Disciplina e Habilidade BNCC no editor |
| **Exportação Word/PDF** | ✅ Concluído | Geração de arquivos `.doc` limpos e impressão A4 Aluno/Professor |
| **Modo Offline PWA** | 🔄 Em Melhoria | Sincronização em background via Service Worker e IndexedDB local |
| **Avaliação por Rubricas** | 🚀 Em Expansão | Calculadora interativa de rubricas pedagógicas e pareceres descritivos |

---

<p align="center">
  <strong>Planner Pro Docente</strong>
</p>
