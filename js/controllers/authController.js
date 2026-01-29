/**
 * @file authController.js
 * @description Gerencia o fluxo de autenticação, sessão do usuário e atualizações de UI relacionadas à conta.
 * @module controllers/authController
 */

import { firebaseService } from '../firebase-service.js';
import { model } from '../model.js';
import { Toast } from '../components/toast.js';

/**
 * @typedef {Object} FirebaseUser
 * @property {string} uid - Identificador único do usuário.
 * @property {string} displayName - Nome de exibição.
 * @property {string} email - Email do usuário.
 * @property {string} [photoURL] - URL da foto de perfil (opcional).
 */

/**
 * Controlador de Autenticação.
 * Responsável pela ponte entre o Firebase Auth, o Model e a View (Sidebar).
 * @namespace authController
 */
export const authController = {

    /**
     * Inicia o monitoramento em tempo real do estado de autenticação.
     * Configura os listeners do Firebase e gerencia o ciclo de vida da sessão (Login/Logout).
     * @returns {void}
     */
    monitorAuth() {
        if (!firebaseService) {
            console.error("❌ AuthController: Firebase Service não disponível.");
            return;
        }

        firebaseService.onAuthStateChanged(async (user) => {
            const cloudStatus = document.getElementById('cloud-status');
            const mainController = window.controller; // Referência segura

            if (user) {
                console.log(`✅ Auth: Usuário detectado - ${user.email}`);
                
                // Atualiza a UI imediatamente
                this.updateAuthButton(true, user);

                // Atualiza indicador de status visual
                if (cloudStatus) {
                    cloudStatus.innerHTML = '<i class="fas fa-check text-green-500"></i> Sync ON';
                    cloudStatus.className = 'flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-100 text-xs font-bold shadow-sm text-emerald-600';
                }

                try {
                    // Sincroniza dados vitais (Core Sync)
                    await model.loadUserData();
                    
                    // Navegação pós-login
                    if (mainController) {
                        const targetView = mainController.currentView || 'dashboard';
                        mainController.navigate(targetView);
                    }
                } catch (error) {
                    console.error("❌ Auth: Falha na sincronização inicial:", error);
                    Toast.show("Erro ao baixar dados da nuvem.", "error");
                    if (cloudStatus) cloudStatus.innerText = "Erro Sync";
                }

            } else {
                // Estado: Deslogado
                console.log("ℹ️ Auth: Sessão encerrada ou inexistente.");
                model.currentUser = null;
                
                if (cloudStatus) {
                    cloudStatus.innerHTML = '<i class="fas fa-cloud text-slate-400"></i> Offline';
                    cloudStatus.className = 'flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-100 text-xs font-bold shadow-sm text-slate-500';
                }
                
                this.updateAuthButton(false);
                
                // Redireciona para dashboard pública/padrão se necessário
                if (mainController) {
                    mainController.navigate('dashboard');
                }
            }
        });
    },

    /**
     * Dispara o processo de login via popup do Google.
     * @async
     * @returns {Promise<void>}
     */
    async handleLogin() {
        try {
            await firebaseService.loginGoogle();
            Toast.show("Login realizado com sucesso!", "success");
        } catch (error) {
            console.error("❌ Auth: Erro no login:", error);
            // Tratamento específico para popup fechado pelo usuário
            if (error.code === 'auth/popup-closed-by-user') {
                Toast.show("Login cancelado.", "info");
            } else {
                Toast.show("Falha ao conectar com Google.", "error");
            }
        }
    },

    /**
     * Gerencia o logout seguro.
     * Solicita confirmação e limpa a memória da aplicação via reload.
     * @returns {void}
     */
    handleLogout() {
        if (!window.controller || !window.controller.confirmarAcao) {
            // Fallback caso o controller principal não esteja carregado
            if (confirm("Deseja realmente sair?")) {
                this._performLogout();
            }
            return;
        }

        window.controller.confirmarAcao(
            'Encerrar Sessão',
            'Deseja sair e parar a sincronização? Seus dados não salvos podem ser perdidos.',
            () => this._performLogout()
        );
    },

    /**
     * Executa a lógica "hard" de logout (Privado).
     * @private
     */
    _performLogout() {
        firebaseService.logout();
        // Recarrega a página para limpar estados globais e variáveis de memória (Segurança)
        window.location.reload();
    },

    /**
     * Renderiza o botão de Login ou o Perfil do Usuário na Sidebar.
     * @param {boolean} isLoggedIn - Estado da autenticação.
     * @param {FirebaseUser|null} [user=null] - Dados do usuário para exibição.
     */
    updateAuthButton(isLoggedIn, user = null) {
        const container = document.getElementById('auth-container');
        if (!container) return;

        if (isLoggedIn && user) {
            // Sanitização básica do nome
            const safeName = user.displayName ? user.displayName.split(' ')[0] : 'Professor(a)';
            const photoUrl = user.photoURL || `https://ui-avatars.com/api/?name=${safeName}&background=0D8ABC&color=fff`;
            
            // Renderiza Cartão de Perfil
            container.innerHTML = `
                <div class="group flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-all duration-200 overflow-hidden" 
                     onclick="authController.handleLogout()"
                     title="Clique para sair">
                    
                    <img src="${photoUrl}" 
                         class="w-8 h-8 rounded-full border border-white/20 shrink-0 object-cover bg-slate-700"
                         onerror="this.src='assets/icons/icon-192.png'"
                         alt="Avatar">
                    
                    <div class="overflow-hidden nav-label transition-all duration-300 flex-1">
                        <p class="text-[10px] text-emerald-400 truncate uppercase font-black tracking-wider flex items-center gap-1">
                            <i class="fas fa-circle text-[6px]"></i> Online
                        </p>
                        <p class="text-sm font-bold text-white truncate w-28 leading-tight">
                            ${safeName}
                        </p>
                    </div>
                    
                    <i class="fas fa-sign-out-alt text-slate-500 group-hover:text-red-400 transition-colors text-sm ml-1"></i>
                </div>
            `;
        } else {
            // Renderiza Botão de Login
            container.innerHTML = `
                <button onclick="authController.handleLogin()"
                    class="group w-full flex items-center gap-3 p-3 bg-white text-primary rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-slate-50 transition-all duration-200 overflow-hidden whitespace-nowrap active:scale-95">
                    <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform">
                        <i class="fab fa-google text-blue-600 text-lg"></i>
                    </div>
                    <span class="nav-label transition-all duration-300 text-sm">Entrar com Google</span>
                </button>
            `;
        }
    },

    /**
     * Força a re-renderização da área do usuário.
     * Útil quando a Sidebar é expandida/recolhida ou o perfil é atualizado.
     */
    updateSidebarUserArea() {
        if (model.currentUser) {
            this.updateAuthButton(true, model.currentUser);
        } else {
            this.updateAuthButton(false);
        }
    }
};

// Exporta para o escopo global para ser acessível via HTML (onclick="authController.xxx")
if (typeof window !== 'undefined') {
    window.authController = authController;
}