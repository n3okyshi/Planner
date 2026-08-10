import { firebaseService } from '../firebase-service.js';

export const authService = {
    async loginGoogle() {
        if (!firebaseService || !firebaseService.loginGoogle) {
            console.warn('[authService] Firebase service indisponível para login');
            return false;
        }
        await firebaseService.loginGoogle();
        return true;
    },
    async logout() {
        if (!firebaseService || !firebaseService.logout) {
            console.warn('[authService] Firebase service indisponível para logout');
            return false;
        }
        await firebaseService.logout();
        return true;
    },
    subscribe(callback) {
        if (!firebaseService || !firebaseService.onAuthStateChanged) return;
        firebaseService.onAuthStateChanged(callback);
    }
};

if (typeof window !== 'undefined') {
    window.authService = authService;
}
