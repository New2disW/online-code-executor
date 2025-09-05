const express = require('express');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' folder

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// --- THIS IS THE NEW FIX ---
// This explicitly tells the server to send the index.html file
// when someone visits the main homepage.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// The rest of your code remains the same
app.post('/execute', (req, res) => {
    const { language, code, stdin } = req.body;

    if (!code || !language) {
        return res.status(400).json({ error: 'Language and code are required.' });
    }

    const uniqueId = uuidv4();
    const fileExtension = { cpp: 'cpp', c: 'c', python: 'py', javascript: 'js' };
    const filePath = path.join(tempDir, `${uniqueId}.${fileExtension[language]}`);
    fs.writeFileSync(filePath, code);

    if (language === 'cpp' || language === 'c') {
        const outputPath = `${filePath}.out`;
        const compiler = language === 'cpp' ? 'g++' : 'gcc';
        
        try {
            execSync(`${compiler} "${filePath}" -o "${outputPath}"`);
        } catch (error) {
            cleanup([filePath]);
            return res.status(500).json({ error: 'Compilation failed.', stderr: error.stderr.toString() });
        }
        
        executeProcess(outputPath, [], stdin, res, [filePath, outputPath]);

    } else {
        let command, args;
        if (language === 'python') { command = 'python3'; }
        else if (language === 'javascript') { command = 'node'; }
        else {
             cleanup([filePath]);
             return res.status(400).json({error: "Language not supported"});
        }
        args = [filePath];
        executeProcess(command, args, stdin, res, [filePath]);
    }
});

function executeProcess(command, args, stdin, res, filesToDelete) {
    const timeout = 10 * 1000;
    const child = spawn(command, args);
    let output = '';
    let stderr = '';

    const timer = setTimeout(() => {
        child.kill('SIGTERM');
    }, timeout);

    child.stdin.write(stdin || '');
    child.stdin.end();

    child.stdout.on('data', (data) => { output += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code, signal) => {
        clearTimeout(timer);
        cleanup(filesToDelete);
        if (signal === 'SIGTERM') {
            return res.status(500).json({ error: `Execution timed out after 10 seconds.`, stderr: output });
        }
        if (code !== 0 && stderr) {
             return res.status(500).json({ error: 'Execution failed.', stderr: stderr || output });
        }
        res.json({ output, stderr });
    });

     child.on('error', (err) => {
        clearTimeout(timer);
        cleanup(filesToDelete);
        res.status(500).json({ error: 'Failed to start execution process.', stderr: err.message });
    });
}

function cleanup(files) {
    files.forEach(file => {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
    });
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

    

