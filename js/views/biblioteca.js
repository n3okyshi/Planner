import { criarMaterialView } from './criarMaterial.js';
import { conteudoGeradoView } from './conteudoGerado.js';
import { controller } from '../controller.js';

export const bibliotecaView = {
    abaAtiva: 'criados',

    mudarAba(aba) {
        if (aba === 'comunidade') {
            controller.navigate('comunidade');
            return;
        }
        if (criarMaterialView) {
            criarMaterialView.mudarAba('meus');
        }
    },

    render(container) {
        if (criarMaterialView) {
            criarMaterialView.abaAtiva = 'meus';
            criarMaterialView.render(container);
        }
    },

    abrirMaterial(id) {
        if (conteudoGeradoView) {
            conteudoGeradoView.setMaterial(id);
        }
        controller.navigate('conteudo-gerado');
    },

    destroy() {},
    onLeave() {}
};

if (typeof window !== 'undefined') {
    window.bibliotecaView = bibliotecaView;
}