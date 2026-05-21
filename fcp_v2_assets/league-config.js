export const leagues = {
    var: {
        id: 'var',
        name: 'Var Champion League',
        logo: 'images/logo var.png',
        background: 'images/bg2.jpg',
        firebaseConfig: {
            apiKey: 'AIzaSyBCC4P4EPj1W4Gu6ubI2xDozxpsCvJksOw',
            authDomain: 'realtimescore-87528.firebaseapp.com',
            databaseURL: 'https://realtimescore-87528-default-rtdb.firebaseio.com',
            projectId: 'realtimescore-87528',
            storageBucket: 'realtimescore-87528.firebasestorage.app',
            messagingSenderId: '354253424800',
            appId: '1:354253424800:web:a3554b47705a579d8d61c5',
            measurementId: 'G-DZ43F4V999'
        }
    },
    agency: {
        id: 'agency',
        name: 'Agency League',
        logo: 'images/agency.png',
        background: 'images/bg2.jpg',
        firebaseConfig: {
            apiKey: 'AIzaSyAs_FmVsTES_W0cmqj0u5ULVFmZUM8BWQA',
            authDomain: 'general-21c81.firebaseapp.com',
            databaseURL: 'https://general-21c81-default-rtdb.firebaseio.com',
            projectId: 'general-21c81',
            storageBucket: 'general-21c81.firebasestorage.app',
            messagingSenderId: '102914838955',
            appId: '1:102914838955:web:18106ed3e671da395502ee',
            measurementId: 'G-6GXKY9030T'
        }
    },
    alcohol: {
        id: 'alcohol',
        name: 'Alcohol SuperLeague',
        logo: 'images/logoalcohol2.png',
        background: 'images/bg2.jpg',
        firebaseConfig: {
            apiKey: 'AIzaSyC5VOsYQGQdav1BMw48GY9ErOuxd-tp6G8',
            authDomain: 'alcohol-dd2b1.firebaseapp.com',
            databaseURL: 'https://alcohol-dd2b1-default-rtdb.firebaseio.com',
            projectId: 'alcohol-dd2b1',
            storageBucket: 'alcohol-dd2b1.firebasestorage.app',
            messagingSenderId: '111449466001',
            appId: '1:111449466001:web:492984bb3519419fcf0b30',
            measurementId: 'G-E2V3GPLSDB'
        }
    },
    '5sao': {
        id: '5sao',
        name: '5 Sao League',
        logo: 'images/logo.png',
        background: 'images/bg2.jpg',
        firebaseConfig: {
            apiKey: 'AIzaSyDmn75Ngpcs6eb2Zsb-dWrzYlSrFLboVnk',
            authDomain: 'sao-26548.firebaseapp.com',
            databaseURL: 'https://sao-26548-default-rtdb.firebaseio.com',
            projectId: 'sao-26548',
            storageBucket: 'sao-26548.firebasestorage.app',
            messagingSenderId: '1078068038535',
            appId: '1:1078068038535:web:9adb166f54303838b5e122',
            measurementId: 'G-414NN274DQ'
        }
    }
};

export const getLeague = (leagueId = 'var') => leagues[leagueId] || leagues.var;

export const getLeagueOptions = () => Object.values(leagues);
