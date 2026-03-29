require('dotenv').config();
const express = require('express');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Critical for Render's health checks

app.use(cors());
app.use(express.json());

// This is the correct path for the new folder structure
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath)); 

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// This route serves the homepage from the correct path
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Code Execution Endpoint (no changes needed)
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

// ─── AI Debug Endpoint ────────────────────────────────────────────────────────
app.post('/api/v1/debug', async (req, res) => {
    const { code, language, error_message } = req.body;

    if (!code || !language || !error_message) {
        return res.status(400).json({
            error: 'Missing required fields: code, language, and error_message are all required.'
        });
    }

    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Server misconfiguration: GEMINI_API_KEY is not set.' });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: `Act as a Senior AI Engineer. Analyze the provided code and error.
 Provide a concise explanation of the bug and a corrected, optimized version of the code.
 You MUST respond ONLY with a valid JSON object — no markdown fences, no extra text — matching this exact schema:
 {"explanation": "<string>", "fixed_code": "<string>"}`
        });

        const prompt = `Language: ${language}

Code:
${code}

Error:
${error_message}`;

        const result = await model.generateContent(prompt);
        const rawText = result.response.text().trim();

        // Strip accidental markdown fences if the model adds them
        const jsonText = rawText.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
        const parsed = JSON.parse(jsonText);

        if (typeof parsed.explanation !== 'string' || typeof parsed.fixed_code !== 'string') {
            throw new Error('Unexpected response shape from AI model.');
        }

        return res.status(200).json(parsed);

    } catch (err) {
        console.error('[/api/v1/debug] Error:', err.message);
        return res.status(500).json({
            error: 'AI analysis failed.',
            details: err.message
        });
    }
});
// ──────────────────────────────────────────────────────────────────────────────

app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});

        

