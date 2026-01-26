// js/controllers/authController.js
import { firebaseService } from '../firebase-service.js';
import { model } from '../model.js';
import { Toast } from '../components/toast.js';

export const authController = {
    // --- Monitoramento de Estado ---
    monitorAuth() {
        if (!firebaseService) return console.error("Firebase Service não carregado.");

        firebaseService.onAuthStateChanged(async (user) => {
            const cloudStatus = document.getElementById('cloud-status');

            if (user) {
                console.log("Usuário logado:", user.email);
                this.updateAuthButton(true, user);

                if (cloudStatus) cloudStatus.innerHTML = '<i class="fas fa-check text-green-500"></i> Sync ON';

                try {
                    await model.loadUserData();
                    // Após carregar os dados da nuvem, navega para a tela atual ou dashboard
                    window.controller.navigate(window.controller.currentView || 'dashboard');
                } catch (error) {
                    console.error("Erro ao carregar dados da nuvem:", error);
                    Toast.show("Erro ao sincronizar dados.", "error");
                }
            } else {
                // Limpeza em caso de logout
                model.currentUser = null;
                if (cloudStatus) cloudStatus.innerHTML = '<i class="fas fa-cloud text-slate-300"></i> Offline';
                this.updateAuthButton(false);
                window.controller.navigate('dashboard');
            }
        });
    },

    // --- Ações de Login/Logout ---
    async handleLogin() {
        try {
            await firebaseService.loginGoogle();
            Toast.show("Login realizado com sucesso!", "success");
        } catch (error) {
            Toast.show("Erro no login Google: " + error.message, 'error');
        }
    },

    handleLogout() {
        window.controller.confirmarAcao(
            'Sair do Sistema?',
            'Deseja encerrar sua sessão e parar a sincronização?',
            () => {
                firebaseService.logout();
                // O reload limpa o estado da memória para segurança
                window.location.reload();
            }
        );
    },

    // --- Interface de Usuário (Auth) ---
    updateAuthButton(isLoggedIn, user = null) {
        const container = document.getElementById('auth-container');
        if (!container) return;

        if (isLoggedIn && user) {
            container.innerHTML = `
                <div class="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 overflow-hidden" onclick="controller.handleLogout()">
                    <img src="${user.photoURL || 'https://ui-avatars.com/api/?name=Prof'}" class="w-8 h-8 rounded-full border border-white/20 shrink-0">
                    <div class="overflow-hidden nav-label transition-all duration-300">
                        <p class="text-xs text-slate-300 truncate">Olá,</p>
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
                    <span class="nav-label transition-all duration-300">Entrar</span>
                </button>
            `;
        }
    },

    updateSidebarUserArea() {
        if (model.currentUser) {
            this.updateAuthButton(true, model.currentUser);
        }
    }
};