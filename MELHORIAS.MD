# 🚀 Roadmap de Evolução: Planner Pro Docente 2026

Este documento centraliza as melhorias planejadas, novas funcionalidades e otimizações técnicas para transformar o Planner Pro na ferramenta definitiva de gestão pedagógica.

---

## 1. Inteligência & Curadoria de Conteúdo
Foco em reduzir o trabalho braçal do professor na alimentação do banco de dados.

* **[ ] Importação Inteligente (OCR/PDF):** Implementar módulo utilizando `pdf.js` e Regex para extrair enunciados e alternativas de arquivos PDF/Word antigos, automatizando o cadastro no banco.
* **[ ] Taxonomia e Dificuldade:** Adicionar metadados às questões (Fácil, Médio, Difícil) e níveis da Taxonomia de Bloom.
* **[ ] Gerador Estatístico de Provas:** Algoritmo para montar avaliações baseadas em equilíbrio de dificuldade (ex: 20% Difícil, 50% Médio, 30% Fácil).
* **[x] Banco Compartilhado (Comunidade):** Sistema global de troca de questões entre usuários. *(Concluído)*

## 2. Analytics & Suporte Pedagógico (Dashboard 2.0)
Transformar dados de notas e chamadas em insights acionáveis.

* **[ ] Gráficos de Evolução de Aprendizagem:** Visualização em linha da média da turma vs. média individual ao longo dos períodos letivos (Bimestres/Trimestres).
* **[ ] Alerta de Risco Preventivo:** Algoritmo que destaca automaticamente (em vermelho) alunos com frequência abaixo de 75% ou queda súbita no rendimento.
* **[ ] Heatmap da BNCC:** Painel visual mostrando quais códigos da BNCC foram mais trabalhados e quais competências ainda não foram cobertas no ano letivo.

## 3. Experiência do Usuário (UX) & Produtividade
Acelerar as tarefas repetitivas do dia a dia em sala de aula.

* **[ ] Diário por Voz:** Integração com a `Web Speech API` para ditado dos registros de aula e observações de alunos.
* **[ ] Chamada "Quick-Action":** Interface otimizada para dispositivos móveis com gestos (swipe) para marcar presença/falta rapidamente.
* **[ ] Sistema de Notificações Push:** Lembretes via Service Worker para fechamento de notas, preenchimento de diário e alertas de feriados.

## 4. Documentação & Relatórios
Facilitar a comunicação com a gestão escolar e responsáveis.

* **[ ] Gerador de Parecer Automático:** Motor de texto que combina notas e observações para gerar um rascunho de relatório individual do aluno.
* **[ ] Repositório de Aula:** Possibilidade de anexar links do Google Drive ou arquivos PDF diretamente nos slots do calendário/planejamento.
* **[ ] Exportação de Boletins em PDF:** Gerar PDF formatado com o resumo de notas e faltas de toda a turma para entrega na secretaria.

## 5. Engenharia & Performance
Melhorias na infraestrutura para garantir escalabilidade.

* **[ ] Sincronização Delta (Firestore):** Otimizar o `model.js` para atualizar apenas campos modificados no Firebase, reduzindo o consumo de dados e custo de escrita.
* **[ ] Resolução de Conflitos Offline:** Implementar lógica de timestamp para decidir qual versão prevalece quando o professor edita o mesmo dado em múltiplos dispositivos offline.
* **[ ] Refatoração de Persistência (DRY):** Centralizar as chamadas de `saveLocal` e `firebaseService` em um único orquestrador dentro do Model.

---
**Legenda:**
- [ ] Planejado
- [/] Em desenvolvimento
- [x] Concluído

<!-- ctrl+shift+v para visualizar o .md -->