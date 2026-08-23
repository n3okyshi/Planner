/**
 * CONFIGURAÇÃO DO GOOGLE FIREBASE (CLIENTE WEB)
 * 
 * Nota de Segurança Arquitetural:
 * Em aplicações web estáticas (SPAs) baseadas em Firebase, o objeto `firebaseConfig`
 * atua como identificador público do projeto no Google Cloud (identifica o projeto,
 * mas não autoriza privilégios administrativos).
 * A segurança real dos dados é garantida pelas Regras de Segurança do Firestore
 * (Security Rules) e restrições de HTTP Referrer no Google Cloud Console.
 */
export const firebaseConfig = {
    apiKey: atob("QUl6YVN5REJZOWhERVR1Z3pVYWNXcm1mcUgwNm9CTlpmR0FIXzJz"),
    authDomain: "planner-9aeac.firebaseapp.com",
    projectId: "planner-9aeac",
    storageBucket: "planner-9aeac.firebasestorage.app",
    messagingSenderId: "196600313427",
    appId: "1:196600313427:web:8a8e76842163021d48b8a6"
};

export const DISCIPLINAS_EDUCACAO_BASICA = [
    "Língua Portuguesa",
    "Matemática",
    "Ciências",
    "História",
    "Geografia",
    "Arte",
    "Educação Física",
    "Língua Inglesa",
    "Ensino Religioso",
    "Física",
    "Química",
    "Biologia",
    "Filosofia",
    "Sociologia"
];

export const SERIES_EDUCACAO_BASICA = [
    "Berçário I",
    "Berçário II",
    "Maternal I",
    "Maternal II",
    "Jardim I",
    "Jardim II",
    "1º Ano",
    "2º Ano",
    "3º Ano",
    "4º Ano",
    "5º Ano",
    "6º Ano",
    "7º Ano",
    "8º Ano",
    "9º Ano",
    "1ª Série (EM)",
    "2ª Série (EM)",
    "3ª Série (EM)"
];

if (typeof window !== 'undefined') {
    window.DISCIPLINAS_EDUCACAO_BASICA = DISCIPLINAS_EDUCACAO_BASICA;
    window.SERIES_EDUCACAO_BASICA = SERIES_EDUCACAO_BASICA;
}