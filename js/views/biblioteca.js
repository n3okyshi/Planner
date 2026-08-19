import { criarMaterialView } from './criarMaterial.js';
import { controller } from '../controller.js';
import { CardComponent } from '../components/card.js';
import { storageService } from '../services/storageService.js';

export const bibliotecaView = {
    abaAtiva: 'criados',

    mudarAba(aba) {
        if (aba === 'comunidade') {
            controller.navigate('comunidade');
            return;
        }
        if (window.criarMaterialView) {
            window.criarMaterialView.mudarAba('meus');
        }
    },

    render(container) {
        if (window.criarMaterialView) {
            window.criarMaterialView.abaAtiva = 'meus';
            window.criarMaterialView.render(container);
        }
    },

    abrirMaterial(id) {
        if (window.conteudoGeradoView) {
            window.conteudoGeradoView.setMaterial(id);
        }
        controller.navigate('conteudo-gerado');
    }
};

if (typeof window !== 'undefined') {
    window.bibliotecaView = bibliotecaView;
}