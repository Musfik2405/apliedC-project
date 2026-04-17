let ws, rsaKeyPair, aesKey;
let peerPublicKey = null;

const ab2b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const b642ab = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

function log(msg, type) {
    const chat = document.getElementById("chat");
    const div = document.createElement("div");
    div.className = type;
    div.innerText = msg;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

async function connect() {
    const ipInput = document.getElementById("ipInput");
    const ip = ipInput ? ipInput.value : "localhost";
    if (ws) ws.close();
    ws = new WebSocket(`ws://${ip}:8080`);
    ws.onopen = () => {
        log("System: Connected to Server", "system");
        document.getElementById("connection-status").innerText = "Connected";
    };
    ws.onmessage = handleMessage;
}

async function exchangeRSA() {
    log("System: Generating RSA Keys...", "system");
    rsaKeyPair = await crypto.subtle.generateKey(
        { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
        true, ["encrypt", "decrypt"]
    );
    const pub = await crypto.subtle.exportKey("spki", rsaKeyPair.publicKey);
    ws.send(JSON.stringify({ type: "publicKey", from: "A", key: ab2b64(pub) }));
    log("Crypto: RSA Public Key Sent to B", "crypto");
}

async function exchangeAES() {
    if (!peerPublicKey) return alert("Error: Exchange RSA keys first!");
    log("System: Generating AES Key...", "system");
    aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    const raw = await crypto.subtle.exportKey("raw", aesKey);
    const encryptedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, peerPublicKey, raw);
    ws.send(JSON.stringify({ type: "aesKey", from: "A", key: ab2b64(encryptedKey) }));
    log("Crypto: AES Key encrypted and Sent", "crypto");
}

async function sendMessage() {
    const input = document.getElementById("msgInput");
    const val = input.value;
    if (!val) return;
    if (!aesKey) {
        ws.send(JSON.stringify({ type: "plain", from: "A", msg: val }));
        log("Me: " + val, "me");
    } else {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, new TextEncoder().encode(val));
        ws.send(JSON.stringify({ type: "secure", from: "A", iv: ab2b64(iv), msg: ab2b64(enc) }));
        log("Me (Secure): " + val, "me");
    }
    input.value = "";
}

async function handleMessage(event) {
    const data = JSON.parse(event.data);
    if (data.from === "A") return; 

    if (data.type === "publicKey") {
        peerPublicKey = await crypto.subtle.importKey("spki", b642ab(data.key), { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]);
        log("Crypto: Received B's Public Key", "crypto");
        if (!rsaKeyPair) await exchangeRSA(); // Auto-reply
    } 
    else if (data.type === "plain") {
        log("B: " + data.msg, "peer");
    } 
    else if (data.type === "secure") {
        const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b642ab(data.iv) }, aesKey, b642ab(data.msg));
        log("B (Secure): " + new TextDecoder().decode(dec), "peer");
    }
}