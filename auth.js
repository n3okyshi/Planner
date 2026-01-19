/**
 * SERVICE - Conexão com Firebase (Auth + Firestore)
 */
const firebaseService = {
    auth: null,
    db: null,
    user: null,
    unsubscribeSnapshot: null, // Para parar de ouvir mudanças se deslogar

    init() {
        // --- COLOQUE SUAS CHAVES AQUI ---
        const firebaseConfig = {
            apiKey: "AIzaSyDBY9hDETugzUacWrmfqH06oBNZfGAH_2s",
            authDomain: "planner-9aeac.firebaseapp.com",
            projectId: "planner-9aeac",
            storageBucket: "planner-9aeac.firebasestorage.app",
            messagingSenderId: "196600313427",
            appId: "1:196600313427:web:8a8e76842163021d48b8a6"
        };
        // -------------------------------

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        this.auth = firebase.auth();
        this.db = firebase.firestore();

        // Monitora Login/Logout
        this.auth.onAuthStateChanged(user => {
            this.user = user;

            if (user) {
                console.log("Usuário conectado:", user.email);
                // Avisa o Model que logou
                if (window.model) model.onLogin(user);
            } else {
                console.log("Usuário desconectado.");
                if (window.model) model.onLogout();
            }

            // Atualiza a UI se estiver na tela de config
            if (typeof controller !== 'undefined' && controller.currentTab === 'config') {
                View.renderSettings('view-container');
            }
        });
    },

    loginGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        this.auth.signInWithPopup(provider).catch(error => {
            console.error("Erro no login:", error);
            alert("Erro ao conectar: " + error.message);
        });
    },

    logout() {
        this.auth.signOut();
    },

    /**
     * Salva os dados no Firestore (Chamado pelo Model)
     */
    async saveData(data) {
        if (!this.user) return;
        try {
            // Salva na coleção 'professores', documento = UID do usuário
            // O merge:true garante que não apague campos extras se existirem
            await this.db.collection('professores').doc(this.user.uid).set({
                plannerData: JSON.stringify(data), // Salvamos como string para evitar problemas com arrays aninhados
                lastUpdate: new Date().toISOString()
            }, { merge: true });
            console.log("Dados sincronizados com a nuvem.");
        } catch (e) {
            console.error("Erro ao salvar na nuvem:", e);
        }
    },

    /**
     * Carrega os dados do Firestore (Chamado ao Logar)
     */
    async loadData() {
        if (!this.user) return null;
        try {
            const doc = await this.db.collection('professores').doc(this.user.uid).get();
            if (doc.exists) {
                const rawData = doc.data().plannerData;
                return rawData ? JSON.parse(rawData) : null;
            }
        } catch (e) {
            console.error("Erro ao baixar dados:", e);
        }
        return null;
    }
};

// Inicia o serviço
firebaseService.init();