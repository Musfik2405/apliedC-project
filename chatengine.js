const WebSocket = require('ws');

// Run on port 8080
const wss = new WebSocket.Server({ port: 8080 });

console.log("Server started on ws://localhost:8080");

wss.on('connection', function connection(ws) {
    // Log how many people are now in the chat
    console.log("A new user connected. Total clients: " + wss.clients.size);

    ws.on('message', function incoming(data) {
        // Convert buffer to string so we can see it
        const message = data.toString();
        console.log('Relaying message: ' + message.substring(0, 50) + "...");

        // BROADCAST: Send the message to every OTHER connected client
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log("User disconnected. Remaining clients: " + (wss.clients.size));
    });

    ws.on('error', (err) => {
        console.error("Server Error: ", err);
    });
});