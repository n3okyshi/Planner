==============================================================================
DIRETRIZES DE DESENVOLVIMENTO, ISSUES E DEPLOY (GITHUB & PR WORKFLOW)
==============================================================================

1. REGRAS ESTRITAS DE CÓDIGO (FULL STACK VANILLA)
   - Linguagens Permitidas: Vanilla JavaScript (ES6+), HTML5 e CSS3.
   - Proibições: Estritamente vedado o uso de Node.js, gerenciadores de pacotes 
     (npm/yarn), frameworks frontend (React, Vue, Angular) ou bibliotecas CSS (Bootstrap, Tailwind via npm/CLI).
   - Exceções Integradas via CDN/Script Global:
     * Firebase Web SDK (Compat v10.7.1)
     * KaTeX / MathJax (para renderização LaTeX)
     * FontAwesome 6 (para iconografia)
   - Arquitetura MVC Modular:
     * Model Layer: js/model.js e js/models/* (Gestão de estado reativo, localStorage e chamadas Firestore).
     * View Layer: js/views/* (Funções de renderização dinâmica que retornam HTML5 limpo).
     * Controller Layer: js/controller.js e js/controllers/* (Orquestração de rotas, eventos de DOM e delegações).

2. FLUXO DE TRABALHO GITHUB (ISSUES & DEPLOY VIA PRs)
   - Nenhuma alteração deve ser enviada diretamente para a branch 'main' ou 'production'.
   - Gestão de Tarefas (Issues):
     * Toda correção, melhoria ou nova funcionalidade deve possuir uma Issue correspondente criada no GitHub.
     * As Issues devem conter título claro, descrição do comportamento esperado e o escopo afetado (Model, View ou Controller).
   - Branches & Pull Requests (PRs):
     * Crie branches no padrão: `feature/descricao-curta`, `fix/descricao-curta` ou `refactor/descricao-curta`.
     * Todo deploy deve obrigatoriamente ser gerenciado via Pull Request (PR).
     * Na descrição do PR, é MANDATÓRIO referenciar a Issue relacionada utilizando palavras-chave de fechamento (ex: "Closes #12", "Fixes #5" ou "Resolves #8").
   - Validação antes do Merge:
     * Garantir compatibilidade offline (Service Worker em sw.js).
     * Validar sanização de inputs para evitar XSS usando `escapeHTML()`.
     * Testar reatividade no `model.js` com os manipuladores reativos e persistência Firestore.
==============================================================================
