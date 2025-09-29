// proxy.js

const WebSocket = require('ws');
const net = require('net');

// --- Configuration ---
const PROXY_PORT = 8892; // Port for your proxy server to listen on
const POOL_HOST = 'gulf.moneroocean.stream'; // Monero mining pool host
const POOL_PORT = 10128; // Monero mining pool port (Stratum TCP)

// --- Create WebSocket Server ---
const wss = new WebSocket.Server({ port: PROXY_PORT });

console.log(`WebSocket proxy started on ws://localhost:${PROXY_PORT}`);
console.log(`Forwarding to mining pool at ${POOL_HOST}:${POOL_PORT}`);

wss.on('connection', (ws) => {
    console.log('Browser connected to proxy.');

    // --- Create TCP Connection to Mining Pool ---
    const poolSocket = new net.Socket();
    let isPoolConnected = false;

    poolSocket.connect(POOL_PORT, POOL_HOST, () => {
        console.log('Proxy connected to mining pool.');
        isPoolConnected = true;
    });

    // --- Handle Messages from Browser -> Pool ---
    ws.on('message', (message) => {
        if (isPoolConnected) {
            // Forward message from browser to the pool
            poolSocket.write(message);
        }
    });

    // --- Handle Data from Pool -> Browser ---
    poolSocket.on('data', (data) => {
        // Forward data from the pool to the browser
        ws.send(data.toString());
    });

    // --- Handle Closures and Errors ---
    ws.on('close', () => {
        console.log('Browser disconnected from proxy.');
        if (isPoolConnected) {
            poolSocket.end();
        }
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err.message);
        if (isPoolConnected) {
            poolSocket.end();
        }
    });

    poolSocket.on('close', () => {
        console.log('Connection to pool closed.');
        isPoolConnected = false;
        if (ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
    });

    poolSocket.on('error', (err) => {
        console.error('Pool connection error:', err.message);
        isPoolConnected = false;
        if (ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
    });
});
