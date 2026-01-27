// js/controllers/authController.js
import { firebaseService } from '../firebase-service.js';
import { model } from '../model.js';
import { Toast } from '../components/toast.js';

/**
 * CONTROLADOR DE AUTENTICAÇÃO
 * Gerencia o estado de login, sincronização de conta e interface de usuário do perfil.
 * @namespace authController
 */
export const authController = {
    
    /**
     * Inicia o monitoramento em tempo real do estado de autenticação do Firebase.
     * Coordena o carregamento de dados da nuvem e atualizações da interface.
     * @returns {void}
     */
    monitorAuth() {
        if (!firebaseService) return console.error("Firebase Service não carregado.");

        firebaseService.onAuthStateChanged(async (user) => {
            const cloudStatus = document.getElementById('cloud-status');

            if (user) {
                console.log("Usuário logado:", user.email);
                this.updateAuthButton(true, user);

                if (cloudStatus) {
                    cloudStatus.innerHTML = '<i class="fas fa-check text-green-500"></i> Sync ON';
                }

                try {
                    // Sincroniza o estado local com os dados remotos do professor
                    await model.loadUserData();
                    
                    // Redireciona para a visão salva ou dashboard após o sync bem-sucedido
                    const targetView = window.controller.currentView || 'dashboard';
                    window.controller.navigate(targetView);
                } catch (error) {
                    console.error("Erro ao carregar dados da nuvem:", error);
                    Toast.show("Erro ao sincronizar dados com o servidor.", "error");
                }
            } else {
                // Procedimento de limpeza (Logout ou Sessão expirada)
                model.currentUser = null;
                
                if (cloudStatus) {
                    cloudStatus.innerHTML = '<i class="fas fa-cloud text-slate-300"></i> Offline';
                }
                
                this.updateAuthButton(false);
                window.controller.navigate('dashboard');
            }
        });
    },

    /**
     * Aciona o fluxo de autenticação via Google Popup.
     * @async
     * @returns {Promise<void>}
     */
    async handleLogin() {
        try {
            await firebaseService.loginGoogle();
            Toast.show("Bem-vindo(a) ao seu Planner!", "success");
        } catch (error) {
            console.error("Erro no login:", error);
            Toast.show("Não foi possível realizar o login Google.", 'error');
        }
    },

    /**
     * Gerencia o processo de logout com confirmação do usuário.
     * Realiza o reload da página para garantir a limpeza total de dados sensíveis na memória.
     * @returns {void}
     */
    handleLogout() {
        window.controller.confirmarAcao(
            'Sair do Sistema?',
            'Deseja encerrar sua sessão e parar a sincronização na nuvem?',
            () => {
                firebaseService.logout();
                // O reload garante que o 'state' em memória do JS seja resetado
                window.location.reload();
            }
        );
    },

    /**
     * Atualiza dinamicamente o componente de login na sidebar.
     * @param {boolean} isLoggedIn - Define se o usuário está autenticado.
     * @param {import('firebase/auth').User|null} [user=null] - Objeto de usuário do Firebase.
     * @returns {void}
     */
    updateAuthButton(isLoggedIn, user = null) {
        const container = document.getElementById('auth-container');
        if (!container) return;

        if (isLoggedIn && user) {
            container.innerHTML = `
                <div class="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 overflow-hidden" 
                     onclick="controller.handleLogout()">
                    <img src="${user.photoURL || 'https://ui-avatars.com/api/?name=Prof'}" 
                         class="w-8 h-8 rounded-full border border-white/20 shrink-0"
                         alt="Avatar">
                    <div class="overflow-hidden nav-label transition-all duration-300">
                        <p class="text-[10px] text-slate-400 truncate uppercase font-black">Conectado</p>
                        <p class="text-xs font-bold text-white truncate w-24">${window.escapeHTML(user.displayName)}</p>
                    </div>
                    <i class="fas fa-sign-out-alt ml-auto text-slate-500 hover:text-red-400 nav-label"></i>
                </div>
            `;
        } else {
            container.innerHTML = `
                <button onclick="controller.handleLogin()"
                    class="w-full flex items-center gap-3 p-3 bg-white text-primary rounded-xl font-bold shadow-lg hover:bg-slate-50 transition-colors overflow-hidden whitespace-nowrap">
                    <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <i class="fab fa-google text-primary"></i>
                    </div>
                    <span class="nav-label transition-all duration-300">Entrar com Google</span>
                </button>
            `;
        }
    },

    /**
     * Força a atualização da área do usuário na Sidebar.
     * Útil em redimensionamentos ou re-renderizações parciais.
     * @returns {void}
     */
    updateSidebarUserArea() {
        if (model.currentUser) {
            this.updateAuthButton(true, model.currentUser);
        }
    }
};