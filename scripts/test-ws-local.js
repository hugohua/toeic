const WebSocket = require('ws');

async function testConnection(port) {
    const url = `ws://localhost:${port}/ws/tts`;
    console.log(`Testing connection to ${url}...`);

    return new Promise((resolve) => {
        const ws = new WebSocket(url);

        ws.on('open', () => {
            console.log(`✅ Connection to port ${port} SUCCESS`);
            ws.close();
            resolve(true);
        });

        ws.on('error', (err) => {
            console.log(`❌ Connection to port ${port} FAILED: ${err.message}`);
            resolve(false);
        });

        ws.on('unexpected-response', (req, res) => {
            console.log(`❌ Connection to port ${port} FAILED: Unexpected response ${res.statusCode}`);
            resolve(false);
        });
    });
}

(async () => {
    // Ensure servers are up - user might have stopped them, but usually they leave it running in background tab or we assume they restart. 
    // Wait, I can't start them here easily. I will assume the user has 'npm run dev' running. 
    // If not, I will ask them to run it.

    // But wait, the previous step showed the user stopped it with ^C.
    // I need to start the server in background to test it, or ask user to.
    // But I can't interactively wait for user. 

    // Actually, I can allow the user to run the test script.
    // But better: I will try to start the servers in detached mode? No, 'npm run dev' is complex.

    // I will WRITE the script, and run it. If it fails ECONNREFUSED, I know servers are down.

    console.log("Starting WebSocket connectivity test...");
    await testConnection(3001); // Backend direct
    await testConnection(3000); // Frontend proxy
})();
