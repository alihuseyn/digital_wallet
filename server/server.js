// dev-server.js
const express = require('express');
const path = require('path');
const livereload = require('livereload');
const connectLivereload = require('connect-livereload');

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Create live reload server
const liveReloadServer = livereload.createServer();
liveReloadServer.watch(path.join(__dirname, 'public'));

// Inject live reload script into pages
app.use(connectLivereload());

// Serve static files from public directory
app.use(express.static('public'));
app.use(express.json());

// Basic API endpoint for testing
app.post('/api/rapyd/payment', (req, res) => {
    // Mock payment processing
    console.log('Received payment request:', req.body);
    res.json({
        status: 'success',
        data: {
            payment_id: 'test_' + Date.now(),
            status: 'SUCCESS',
            amount: 1,
            currency: 'USD'
        }
    });
});

// Apple Pay merchant validation endpoint
app.post('/api/apple-pay/validate-merchant', (req, res) => {
    // Mock merchant validation
    console.log('Received merchant validation request:', req.body);
    res.json({
        merchantIdentifier: 'test_merchant',
        displayName: "Example Store",
        initiative: "web",
        initiativeContext: req.headers.origin
    });
});

// Handle SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Dev server running at http://localhost:${port}`);
});

// Trigger refresh when server restarts
liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
        liveReloadServer.refresh("/");
    }, 100);
});