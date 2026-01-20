const firebaseService = {
    auth: null,
    db: null,
    init() {
        const firebaseConfig = {
            apiKey: "AIzaSyDBY9hDETugzUacWrmfqH06oBNZfGAH_2s",
            authDomain: "planner-9aeac.firebaseapp.com",
            projectId: "planner-9aeac",
            storageBucket: "planner-9aeac.firebasestorage.app",
            messagingSenderId: "196600313427",
            appId: "1:196600313427:web:8a8e76842163021d48b8a6"
        };
        if (typeof firebase === 'undefined') {
            console.error("ERRO: Firebase SDK não foi carregado no HTML.");
            return;
        }
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        console.log("Firebase Service inicializado.");
    },
    // Método essencial para o Controller ouvir as mudanças de estado
    onAuthStateChanged(callback) {
        if (this.auth) {
            this.auth.onAuthStateChanged(callback);
        }
    },
    async loginGoogle() {
        if (!this.auth) return;
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await this.auth.signInWithPopup(provider);
        } catch (error) {
            console.error("Erro no login Google:", error);
            throw error;
        }
    },
    async logout() {
        if (!this.auth) return;
        try {
            await this.auth.signOut();
            window.location.reload(); // Garante limpeza total da memória
        } catch (error) {
            console.error("Erro ao sair:", error);
        }
    },
    async saveData(uid, appState) {
        if (!uid || !this.db) return;
        
        const user = this.auth.currentUser;
        
        try {
            const payload = {
                plannerData: JSON.stringify(appState), // Correção: usa o appState passado, não 'data'
                lastUpdate: new Date().toISOString()
            };
            
            if (user && user.email) {
                payload.email = user.email;
            }
            await this.db.collection('professores').doc(uid).set(payload, { merge: true });
            // console.log("Dados salvos na nuvem.");
        } catch (e) {
            console.error("Erro ao salvar no Firestore:", e);
        }
    },
    async getData(uid) {
        if (!uid || !this.db) return null;
        try {
            const doc = await this.db.collection('professores').doc(uid).get();
            if (doc.exists) {
                const data = doc.data();
                // Tenta fazer o parse se estiver stringificado, senão retorna direto
                return data.plannerData ? JSON.parse(data.plannerData) : data;
            }
        } catch (e) {
            console.error("Erro ao baixar do Firestore:", e);
        }
        return null;
    }
};
// Exposição global
window.firebaseService = firebaseService;
// Inicializa imediatamente para estar pronto quando o Controller carregar
firebaseService.init();
