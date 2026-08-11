import { bnccView } from '../views/bncc.js';
import { turmasView } from '../views/turmas.js';
import { calendarioView } from '../views/calendario.js';
import { mensalView } from '../views/mensal.js';
import { planejamentoView } from '../views/planejamento.js';
import { diarioView } from '../views/diario.js';
import { salaView } from '../views/sala.js';
import { provasView } from '../views/provas.js';
import { frequenciaView } from '../views/frequencia.js';
import { settingsView } from '../views/settings.js';
import { dashboardView } from '../views/dashboard.js';
import { horarioView } from '../views/horario.js';
import { estatisticasProvaView, estatisticasProvasView } from '../views/estatisticasProva.js';
import { comunidadeView } from '../views/comunidade.js';
import { notasAnuaisView } from '../views/notasAnuais.js';
import { criarMaterialView } from '../views/criarMaterial.js';
import { bibliotecaView } from '../views/biblioteca.js';
import { quizGestorView } from '../views/quizGestor.js';
import { quizPlayerView } from '../views/quizPlayer.js';
import { conteudoGeradoView } from '../views/conteudoGerado.js';
import { correcaoAutomaticaView } from '../views/correcaoAutomatica.js';
import { simuladoresView } from '../views/simuladores.js';
import { bimestralizacaoView } from '../views/bimestralizacao.js';
import { estudosVisuaisView } from '../views/estudosVisuais.js';

export const viewRegistry = {
    dashboard: dashboardView,
    horario: horarioView,
    calendario: calendarioView,
    mensal: mensalView,
    periodo: planejamentoView,
    dia: diarioView,
    turmas: turmasView,
    bncc: bnccView,
    bimestralizacao: bimestralizacaoView,
    bimestralizacoes: bimestralizacaoView,
    mapa: salaView,
    provas: provasView,
    frequencia: frequenciaView,
    config: settingsView,
    'stats-provas': estatisticasProvasView,
    comunidade: comunidadeView,
    'notas-anuais': notasAnuaisView,
    'criar-material': criarMaterialView,
    biblioteca: bibliotecaView,
    'quiz-gestor': quizGestorView,
    'quiz-player': quizPlayerView,
    'conteudo-gerado': conteudoGeradoView,
    correcao: correcaoAutomaticaView,
    simuladores: simuladoresView,
    'estudos-visuais': estudosVisuaisView,
    flashcards: estudosVisuaisView,
    mindmaps: estudosVisuaisView,
    'mapas-mentais': estudosVisuaisView
};

export const publicViewAliases = {
    estudosVisuaisView,
    salaView,
    diarioView,
    turmasView,
    planejamentoView,
    bnccView,
    bimestralizacaoView,
    provasView,
    frequenciaView,
    horarioView,
    mensalView,
    estatisticasProvasView,
    comunidadeView,
    notasAnuaisView,
    settingsView,
    criarMaterialView,
    bibliotecaView,
    quizGestorView,
    quizPlayerView,
    conteudoGeradoView,
    correcaoAutomaticaView,
    simuladoresView
};

if (typeof window !== 'undefined') {
    window.viewRegistry = viewRegistry;
}
