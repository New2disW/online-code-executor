const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// This will log the exact directory paths in the Vercel server environment.
console.log(`[DEBUG] Current working directory: ${process.cwd()}`);
console.log(`[DEBUG] __dirname is: ${__dirname}`);

// A simple test route to see if the server is running at all.
app.get('/api/health', (req, res) => {
    res.send('The server is alive and responding!');
});

// This is the main test. It will try to find and send your index.html file.
app.get('/', (req, res) => {
    const htmlPath = path.join(process.cwd(), 'public', 'index.html');
    console.log(`[DEBUG] Attempting to serve file from this exact path: ${htmlPath}`);
    
    res.sendFile(htmlPath, (err) => {
        if (err) {
            // If it fails, it will print a detailed error in the logs.
            console.error("[ERROR] Failed to send index.html:", err);
            res.status(500).send(`Server Error: Could not find the file. I was looking for it at: ${htmlPath}. Error details: ${err.message}`);
        } else {
            console.log("[SUCCESS] Successfully sent index.html!");
        }
    });
});

app.listen(PORT, () => {
    console.log(`Diagnostic server is listening on port ${PORT}`);
});
