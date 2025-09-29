// proxy.js

const WebSocket = require('ws');
const net = require('net');
const http = require('http'); // Import the http module
const fs = require('fs');     // Import the file system module
const path = require('path'); // Import the path module

// --- Configuration ---
// Render provides the port to use via the PORT environment variable
const PORT = process.env.PORT || 8892;
const POOL_HOST = 'gulf.moneroocean.stream';
const POOL_PORT = 10128;

// --- Create an HTTP Server ---
const server = http.createServer((req, res) => {
    let filePath;
    let contentType = 'text/html'; // Default content type

    if (req.url === '/') {
        filePath = path.join(__dirname, 'index.html');
    } else if (req.url === '/wmp.js') {
        filePath = path.join(__dirname, 'wmp.js');
        contentType = 'application/javascript'; // Set correct type for JS
    } else {
        res.writeHead(404); // For favicon.ico and other requests
        res.end();
        return;
    }

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end('Error loading file');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
});

// --- Create WebSocket Server and attach it to the HTTP server ---
const wss = new WebSocket.Server({ server }); // Attach to the HTTP server

console.log(`HTTP and WebSocket server started on port ${PORT}`);
console.log(`Forwarding to mining pool at ${POOL_HOST}:${POOL_PORT}`);

wss.on('connection', (ws) => {
    // ... (The rest of your WebSocket proxy logic is exactly the same)
    console.log('Browser connected to proxy.');

    const poolSocket = new net.Socket();
    let isPoolConnected = false;

    poolSocket.connect(POOL_PORT, POOL_HOST, () => {
        console.log('Proxy connected to mining pool.');
        isPoolConnected = true;
    });

    ws.on('message', (message) => {
        if (isPoolConnected) {
            poolSocket.write(message);
        }
    });

    poolSocket.on('data', (data) => {
        ws.send(data.toString());
    });

    ws.on('close', () => {
        console.log('Browser disconnected from proxy.');
        if (isPoolConnected) poolSocket.end();
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err.message);
        if (isPoolConnected) poolSocket.end();
    });

    poolSocket.on('close', () => {
        console.log('Connection to pool closed.');
        isPoolConnected = false;
        if (ws.readyState === WebSocket.OPEN) ws.close();
    });

    poolSocket.on('error', (err) => {
        console.error('Pool connection error:', err.message);
        isPoolConnected = false;
        if (ws.readyState === WebSocket.OPEN) ws.close();
    });
});

// --- Start Listening ---
server.listen(PORT, () => {
    console.log(`Server is live and listening on port ${PORT}`);
});
