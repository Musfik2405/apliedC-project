// const net = require("net");
// const crypto = require("crypto");
// const readline = require("readline");

// let aesKey = null;
// let isReady = false;
// let serverPublicKey = null;

// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout
// });

// // RSA keys
// const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
//   modulusLength: 2048,
// });

// console.log("\n=== CLIENT A STARTED ===");

// rl.question("Enter Server IP: ", (ip) => {

//   const client = new net.Socket();
//   let buffer = "";

//   client.connect(5000, ip, () => {
//     console.log("Connected!");

//     client.write(JSON.stringify({
//       type: "publicKey",
//       data: publicKey.export({ type: "pkcs1", format: "pem" })
//     }) + "\n");
//   });

//   client.on("data", (data) => {
//     buffer += data.toString();

//     let parts = buffer.split("\n");
//     buffer = parts.pop();

//     for (let part of parts) {
//       if (!part.trim()) continue;

//       const message = JSON.parse(part);
//       handleMessage(message);
//     }
//   });

//   // ✅ FIXED INPUT
//   rl.on("line", (msg) => {
//     if (!isReady) {
//       console.log("⏳ Wait for secure setup...");
//       return;
//     }

//     const iv = crypto.randomBytes(16);
//     const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, iv);

//     const encrypted = Buffer.concat([
//       cipher.update(msg),
//       cipher.final()
//     ]);

//     client.write(JSON.stringify({
//       type: "message",
//       data: encrypted.toString("base64"),
//       iv: iv.toString("base64")
//     }) + "\n");
//   });

//   function handleMessage(message) {

//     if (message.type === "publicKey") {
//       serverPublicKey = message.data;

//       aesKey = crypto.randomBytes(32);
//       const encryptedKey = crypto.publicEncrypt(serverPublicKey, aesKey);

//       client.write(JSON.stringify({
//         type: "aesKey",
//         data: encryptedKey.toString("base64")
//       }) + "\n");

//       isReady = true;
//       console.log("✅ Secure chat ready!\n");
//     }

//     else if (message.type === "message") {
//       const iv = Buffer.from(message.iv, "base64");
//       const encryptedText = Buffer.from(message.data, "base64");

//       const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);

//       const decrypted = Buffer.concat([
//         decipher.update(encryptedText),
//         decipher.final()
//       ]);

//       console.log("B:", decrypted.toString());
//     }
//   }
// });

const net = require("net");
const crypto = require("crypto");
const readline = require("readline");

let aesKey = null;
let secureMode = false;
let serverPublicKey = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// RSA keys
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

console.log("\n=== CLIENT A STARTED ===");

rl.question("Enter Server IP: ", (ip) => {

  const client = new net.Socket();
  let buffer = "";

  client.connect(5000, ip, () => {
    console.log("Connected!");
    console.log("💬 Plaintext mode active. Type /secure to enable encryption.\n");
  });

  client.on("data", (data) => {
    buffer += data.toString();
    let parts = buffer.split("\n");
    buffer = parts.pop();

    for (let part of parts) {
      if (!part.trim()) continue;
      const message = JSON.parse(part);
      handleMessage(message, client);
    }
  });

  rl.on("line", (msg) => {

    // 🔐 Start secure mode
    if (msg === "/secure") {
      console.log("🔐 Starting secure mode...");

      client.write(JSON.stringify({
        type: "publicKey",
        data: publicKey.export({ type: "pkcs1", format: "pem" })
      }) + "\n");

      return;
    }

    // 🔓 Plaintext mode
    if (!secureMode) {
      client.write(JSON.stringify({
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

    client.write(JSON.stringify({
      type: "message",
      data: encrypted.toString("base64"),
      iv: iv.toString("base64")
    }) + "\n");
  });

  function handleMessage(message, client) {

    // 🔓 Plain
    if (message.type === "plain") {
      console.log("B:", message.data);
    }

    // 🔐 Public key received
    else if (message.type === "publicKey") {
      serverPublicKey = message.data;

      aesKey = crypto.randomBytes(32);
      const encryptedKey = crypto.publicEncrypt(serverPublicKey, aesKey);

      client.write(JSON.stringify({
        type: "aesKey",
        data: encryptedKey.toString("base64")
      }) + "\n");

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

      console.log("B:", decrypted.toString());
    }
  }
});