// const net = require("net");
// const crypto = require("crypto");
// const os = require("os");
// const readline = require("readline");

// let aesKey = null;
// let isReady = false;

// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout
// });

// // RSA keys
// const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
//   modulusLength: 2048,
// });

// console.log("\n=== CLIENT B (SERVER) STARTED ===");

// // Show IP
// const interfaces = os.networkInterfaces();
// for (let name in interfaces) {
//   for (let netInfo of interfaces[name]) {
//     if (netInfo.family === "IPv4" && !netInfo.internal) {
//       console.log("Your IP Address:", netInfo.address);
//     }
//   }
// }

// const server = net.createServer((socket) => {
//   console.log("\nClient A connected!");

//   let buffer = "";

//   socket.on("data", (data) => {
//     buffer += data.toString();

//     let parts = buffer.split("\n");
//     buffer = parts.pop();

//     for (let part of parts) {
//       if (!part.trim()) continue;

//       const message = JSON.parse(part);
//       handleMessage(message, socket);
//     }
//   });

//   // ✅ FIXED INPUT (NO CHAR SPLIT)
//   rl.on("line", (msg) => {
//     if (!isReady) {
//       console.log("⏳ Wait for AES key...");
//       return;
//     }

//     const iv = crypto.randomBytes(16);
//     const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, iv);

//     const encrypted = Buffer.concat([
//       cipher.update(msg),
//       cipher.final()
//     ]);

//     socket.write(JSON.stringify({
//       type: "message",
//       data: encrypted.toString("base64"),
//       iv: iv.toString("base64")
//     }) + "\n");
//   });

// });

// function handleMessage(message, socket) {

//   if (message.type === "publicKey") {
//     socket.write(JSON.stringify({
//       type: "publicKey",
//       data: publicKey.export({ type: "pkcs1", format: "pem" })
//     }) + "\n");
//   }

//   else if (message.type === "aesKey") {
//     const encryptedKey = Buffer.from(message.data, "base64");
//     aesKey = crypto.privateDecrypt(privateKey, encryptedKey);
//     isReady = true;

//     console.log("✅ Secure chat ready!\n");
//   }

//   else if (message.type === "message") {
//     const iv = Buffer.from(message.iv, "base64");
//     const encryptedText = Buffer.from(message.data, "base64");

//     const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);

//     const decrypted = Buffer.concat([
//       decipher.update(encryptedText),
//       decipher.final()
//     ]);

//     console.log("A:", decrypted.toString());
//   }
// }

// server.listen(5000, "0.0.0.0", () => {
//   console.log("Listening on port 5000...");
// });

const net = require("net");
const crypto = require("crypto");
const os = require("os");
const readline = require("readline");

let aesKey = null;
let secureMode = false;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// RSA keys
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

console.log("\n=== CLIENT B (SERVER) STARTED ===");

// Show IP
const interfaces = os.networkInterfaces();
for (let name in interfaces) {
  for (let netInfo of interfaces[name]) {
    if (netInfo.family === "IPv4" && !netInfo.internal) {
      console.log("Your IP Address:", netInfo.address);
    }
  }
}

const server = net.createServer((socket) => {
  console.log("\nClient A connected!");
  console.log("💬 Plaintext mode active. Type /secure to enable encryption.\n");

  let buffer = "";

  socket.on("data", (data) => {
    buffer += data.toString();
    let parts = buffer.split("\n");
    buffer = parts.pop();

    for (let part of parts) {
      if (!part.trim()) continue;
      const message = JSON.parse(part);
      handleMessage(message, socket);
    }
  });

  rl.on("line", (msg) => {

    // 🔐 Start secure mode
    if (msg === "/secure") {
      console.log("🔐 Waiting for client to initiate secure mode...");
      return;
    }

    // 🔓 Plaintext mode
    if (!secureMode) {
      socket.write(JSON.stringify({
        type: "plain",
        data: msg
      }) + "\n");
      return;
    }

    // 🔐 Encrypted mode
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(msg),
      cipher.final()
    ]);

    socket.write(JSON.stringify({
      type: "message",
      data: encrypted.toString("base64"),
      iv: iv.toString("base64")
    }) + "\n");
  });

});

function handleMessage(message, socket) {

  // 🔓 Plain message
  if (message.type === "plain") {
    console.log("A:", message.data);
  }

  // 🔐 Public key exchange
  else if (message.type === "publicKey") {
    socket.write(JSON.stringify({
      type: "publicKey",
      data: publicKey.export({ type: "pkcs1", format: "pem" })
    }) + "\n");
  }

  // 🔐 AES key
  else if (message.type === "aesKey") {
    const encryptedKey = Buffer.from(message.data, "base64");
    aesKey = crypto.privateDecrypt(privateKey, encryptedKey);

    secureMode = true;
    console.log("🔐 Secure mode activated!\n");
  }

  // 🔐 Encrypted message
  else if (message.type === "message") {
    const iv = Buffer.from(message.iv, "base64");
    const encryptedText = Buffer.from(message.data, "base64");

    const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);

    const decrypted = Buffer.concat([
      decipher.update(encryptedText),
      decipher.final()
    ]);

    console.log("A:", decrypted.toString());
  }
}

server.listen(5000, "0.0.0.0", () => {
  console.log("Listening on port 5000...");
});