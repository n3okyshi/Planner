# Planner Pro Docente 2026 🎓

O **Planner Pro Docente 2026** é uma aplicação web completa para gestão pedagógica, projetada para auxiliar professores na organização de turmas, notas, frequência e planejamento de aulas. Focado na produtividade e na experiência do usuário, o sistema oferece uma interface moderna e responsiva.

## 🚀 Funcionalidades Principais

*   **Gestão de Turmas e Alunos:** Cadastro completo de turmas, séries e alunos.
*   **Diário de Classe Digital:** Planejamento diário com suporte a habilidades da BNCC.
*   **Controle de Frequência:** Chamada rápida (Swipe) e visão mensal de presenças.
*   **Diário de Notas:** Lançamento de avaliações e cálculo automático de médias.
*   **Dashboard Pedagógico:** Visão geral do dia, pendências e aniversariantes.
*   **Análise de Risco Preventivo:** Identificação automática de alunos com baixa frequência ou rendimento.
*   **Ditado por Voz:** Recurso de acessibilidade e produtividade para preenchimento de planos de aula.
*   **Consulta BNCC:** Banco de dados integrado com habilidades da Base Nacional Comum Curricular.
*   **Sincronização em Nuvem:** Integração com Firebase para persistência de dados.
*   **Exportação e Backup:** Geração de relatórios em PDF e backup local (JSON).

## 🛠️ Tecnologias Utilizadas

*   **Frontend:** HTML5, CSS3 (Tailwind CSS), JavaScript (ES6 Modules).
*   **Backend / BaaS:** Google Firebase (Authentication & Firestore).
*   **Bibliotecas:**
    *   *Tailwind CSS* (Estilização)
    *   *Font Awesome* (Ícones)
    *   *KaTeX* (Renderização Matemática)

## 📦 Como Executar

Este é um projeto estático (SPA - Single Page Application) que pode ser hospedado em qualquer servidor web estático.

### Requisitos
*   Navegador moderno (Chrome, Edge, Firefox).
*   Servidor web local para desenvolvimento (ex: Live Server do VSCode, `python -m http.server`, etc).

### Instalação
1.  Clone o repositório:
    ```bash
    git clone https://github.com/seu-usuario/planner-pro-docente.git
    ```
2.  Navegue até a pasta do projeto:
    ```bash
    cd planner-pro-docente
    ```
3.  **Configuração do Firebase:**
    *   Renomeie o arquivo de exemplo:
        ```bash
        mv js/config.example.js js/config.js
        ```
    *   Edite `js/config.js` e adicione suas credenciais do Firebase.

4.  Inicie um servidor local. Exemplo com Python:
    ```bash
    python3 -m http.server 8000
    ```
4.  Acesse `http://localhost:8000` no seu navegador.

## 🔒 Melhorias Recentes de Segurança e UX

### Segurança
*   **Content Security Policy (CSP):** Implementação de cabeçalhos de segurança para mitigar ataques XSS e injeção de dados.
*   **Sanitização de Dados:** Uso rigoroso de funções de escape para prevenir renderização de scripts maliciosos.

### Experiência do Usuário (UX)
*   **Ditado por Voz (Web Speech API):** Adicionado botão de microfone nos campos de "Metodologia" e "Avaliação" do Diário de Classe, permitindo que o professor dite o conteúdo da aula.
*   **Feedback Visual:** Indicadores de gravação e animações de pulso para melhor interatividade.

### Analytics e Pedagógico
*   **Alerta de Risco Preventivo:** O sistema agora destaca automaticamente alunos na listagem da turma que apresentam:
    *   Frequência abaixo de 75%.
    *   Aproveitamento de notas abaixo de 60%.
    Isso permite intervenção pedagógica rápida e eficaz.

## 💡 Recomendações Futuras

Para a evolução contínua do projeto, sugerimos as seguintes melhorias técnicas:

1.  **Migração para Build System:** Adotar ferramentas como Vite ou Webpack para otimização de assets, minificação de código e melhor gerenciamento de dependências (substituindo CDNs em produção).
2.  **Variáveis de Ambiente:** Mover as configurações do Firebase (API Keys) para arquivos `.env` e injetá-las durante o build, evitando exposição direta no código-fonte.
3.  **PWA (Progressive Web App):** Aprimorar o `manifest.json` e `sw.js` para permitir instalação completa e funcionamento offline robusto.
4.  **Testes Automatizados:** Implementar testes unitários (Jest) e end-to-end (Cypress/Playwright) para garantir a estabilidade das funcionalidades críticas como cálculo de médias e sincronização.
5.  **Regras de Segurança Firestore:** Refinar as `firestore.rules` para garantir que cada professor acesse estritamente apenas seus próprios dados no backend.

---

Desenvolvido com foco na educação. 🍎
