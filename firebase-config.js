// Decode helper: reverse the string, then base64-decode
function decodeObf(obf) {
    if (!obf || typeof obf !== 'string') return '';
    const reversed = obf.trim().split('').reverse().join('');
    try {
        return atob(reversed);
    } catch (e) {
        console.error('Failed to decode obfuscated value:', e);
        return '';
    }
}

// Obfuscated values provided by user (reverse(base64(value)))
const OBF = {
    apiKey: 'ZZWOCp3UqxEW4A3TfhHZ3QVO1gFThVVRPd3QRhWV6lER5NVY6lUQ',
    authDomain: '=02bj5CcwFWZzFmYlJXam5SN5ATNh1Cbhl2YvNXLw9Gd',
    databaseURL: '=AHch5SZzFmYhRXYkV2chJWZylmZuEDdzFWZoRXdvNXLhl2ch5iYkRnctQHb1FmZlRWL1kDM1EWLsFWaj92ctA3b09yL6MHc0RHa',
    projectId: '==QN5ATNh1Cbhl2YvNXLw9Gd',
    storageBucket: '==QbvNmL09GczBHch5SN5ATNh1Cbhl2YvNXLw9Gd',
    messagingSenderId: '3UDN5ADN4kDM5UzN',
    appId: '=ATN0QjZkJzM5EWO4M2NlRjM5YmNzEmOiV2d6cTN0kDM0gTOwkTN3oTM',
    measurementId: 'wYlVMZ0NZFTMy0yR'
};

const firebaseConfig = {
    apiKey: decodeObf(OBF.apiKey),
    authDomain: decodeObf(OBF.authDomain),
    databaseURL: decodeObf(OBF.databaseURL),
    projectId: decodeObf(OBF.projectId),
    storageBucket: decodeObf(OBF.storageBucket),
    messagingSenderId: decodeObf(OBF.messagingSenderId),
    appId: decodeObf(OBF.appId),
    measurementId: decodeObf(OBF.measurementId)
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
