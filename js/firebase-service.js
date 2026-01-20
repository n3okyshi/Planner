const firebaseService = {
    auth: null,
    db: null,
    user: null,
    init() {
        const firebaseConfig = {
            apiKey: "AIzaSyDBY9hDETugzUacWrmfqH06oBNZfGAH_2s",
            authDomain: "planner-9aeac.firebaseapp.com",
            projectId: "planner-9aeac",
            storageBucket: "planner-9aeac.firebasestorage.app",
            messagingSenderId: "196600313427",
            appId: "1:196600313427:web:8a8e76842163021d48b8a6"
        };
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.auth.onAuthStateChanged(user => {
            this.user = user;
            if (user) {
                console.log("Firebase: Conectado como", user.email);
                if (window.model) model.onLogin(user);
            } else {
                console.log("Firebase: Desconectado.");
                if (window.model) model.onLogout();
            }
            if (typeof controller !== 'undefined' && controller.currentTab === 'config') {
                if (window.View && View.renderSettings) View.renderSettings('view-container');
            }
        });
    },
    loginGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .then(() => {
                return this.auth.signInWithPopup(provider);
            })
            .catch(error => {
                console.error("Erro login:", error);
                alert("Erro ao conectar: " + error.message);
            });
    },
    logout() {
        this.auth.signOut();
    },
    async saveData(uid, appState) {
        if (!uid) return;
        try {
            const payload = {
                plannerData: JSON.stringify(appState),
                lastUpdate: new Date().toISOString(),
                email: this.user ? this.user.email : 'user'
            };
            await this.db.collection('professores').doc(uid).set(payload, { merge: true });
            console.log("Firebase: Upload concluído.");
        } catch (e) {
            console.error("Firebase: Erro no upload.", e);
            throw e;
        }
    },
    async getData(uid) {
        if (!uid) return null;
        try {
            const doc = await this.db.collection('professores').doc(uid).get();
            if (doc.exists) {
                const data = doc.data();
                if (data.plannerData) {
                    const parsedData = JSON.parse(data.plannerData);
                    parsedData.lastUpdate = data.lastUpdate || parsedData.lastUpdate;
                    return parsedData;
                }
                return data;
            }
        } catch (e) {
            console.error("Firebase: Erro no download.", e);
        }
        return null;
    }
};
window.firebaseService = firebaseService;
firebaseService.init();