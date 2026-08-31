
import { firebaseService } from '../firebase-service.js';
import { model } from '../model.js';
import { Toast } from '../components/toast.js';

export const authController = {
    monitorAuth() {
        if (!firebaseService) {
            console.error("❌ AuthController: Firebase Service não disponível.");
            return;
        }
        firebaseService.onAuthStateChanged(async (user) => {
            const cloudStatus = document.getElementById('cloud-status');
            const mainController = window.controller;

            if (user) {
                console.log(`✅ Auth: Usuário detectado - ${user.email}`);
                model.currentUser = user;
                this.updateAuthButton(true, user);

                if (cloudStatus) {
                    cloudStatus.innerHTML = '<i class="fas fa-check status-badge--online"></i> <span class="desktop-only">Sync ON</span>';
                    cloudStatus.className = 'status-badge status-badge--online';
                }

                try {
                    await model.loadUserData(user);
                    this.updateAuthButton(true, model.currentUser || user);

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
                console.log("ℹ️ Auth: Sessão encerrada ou inexistente.");
                model.currentUser = null;

                if (cloudStatus) {
                    cloudStatus.innerHTML = '<i class="fas fa-cloud status-badge--offline"></i> Offline';
                    cloudStatus.className = 'status-badge status-badge--offline';
                }

                this.updateAuthButton(false);

                if (mainController) {
                    mainController.navigate('dashboard');
                }
            }
        });
    },

    async handleLogin() {
        try {
            await firebaseService.loginGoogle();
            Toast.show("Login realizado com sucesso!", "success");
        } catch (error) {
            console.error("❌ Auth: Erro no login:", error);
            if (error.code === 'auth/popup-closed-by-user') {
                Toast.show("Login cancelado.", "info");
            } else {
                Toast.show("Falha ao conectar com Google.", "error");
            }
        }
    },

    handleLogout() {
        if (!window.controller || !window.controller.confirmarAcao) {
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

    _performLogout() {
        firebaseService.logout();
        model.currentUser = null;
        this.updateAuthButton(false);
        window.location.reload();
    },

    updateAuthButton(isLoggedIn, user = null) {
        const container = document.getElementById('auth-container');
        if (!container) return;

        const activeUser = user || model.currentUser || firebaseService?.auth?.currentUser;

        if (isLoggedIn && activeUser) {
            const nomeSafe = activeUser.displayName ? activeUser.displayName.split(' ')[0] : 'Professor(a)';
            const nomeEncodado = encodeURIComponent(nomeSafe);
            const urlFoto = activeUser.photoURL || `https://ui-avatars.com/api/?name=${nomeEncodado}&background=0D8ABC&color=fff`;

            container.innerHTML = `
                <div class="auth-card" onclick="controller.handleLogout()" title="Clique para encerrar a sessão">
                    <img src="${window.escapeHTML(urlFoto)}" 
                         class="auth-card__avatar"
                         referrerpolicy="no-referrer"
                         onerror="this.onerror=null;this.src='assets/icons/icon-192.png';"
                         alt="Avatar">
                    
                    <div class="auth-card__info nav-label">
                        <p class="auth-card__status">
                            <i class="fas fa-circle"></i> Online
                        </p>
                        <p class="auth-card__name">
                            ${window.escapeHTML(nomeSafe)}
                        </p>
                    </div>
                    
                    <i class="fas fa-sign-out-alt auth-card__icon"></i>
                </div>
            `;
        } else {
            container.innerHTML = `
                <button onclick="controller.handleLogin()" class="btn-login" title="Conectar com sua conta Google">
                    <div class="btn-login__icon-wrap">
                        <i class="fab fa-google btn-login__icon"></i>
                    </div>
                    <span class="btn-login__text nav-label">Entrar com Google</span>
                </button>
            `;
        }
    },

    updateSidebarUserArea() {
        const activeUser = model.currentUser || firebaseService?.auth?.currentUser;
        if (activeUser) {
            this.updateAuthButton(true, activeUser);
        } else {
            this.updateAuthButton(false);
        }
    }
};

if (typeof window !== 'undefined') {
    window.authController = authController;
}