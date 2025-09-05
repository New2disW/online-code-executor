const express = require('express');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

//console.log("Server starting up. Temporary directory is ready.");

app.post('/execute', (req, res) => {
    const { language, code, stdin } = req.body;
    console.log(`\n[${new Date().toLocaleTimeString()}] Received request to execute ${language}`);
    console.log("   | Code Snippet: \n" + code.split('\n').map(l => `   |   ${l}`).join('\n'));
    console.log(`   | Standard Input: "${stdin}"`);

    if (!code || !language) {
        return res.status(400).json({ error: 'Language and code are required.' });
    }

    const uniqueId = uuidv4();
    const fileExtension = { cpp: 'cpp', c: 'c', python: 'py', javascript: 'js' };
    const filePath = path.join(tempDir, `${uniqueId}.${fileExtension[language]}`);
    fs.writeFileSync(filePath, code);
    console.log(`   | Code saved to temporary file: ${filePath}`);

    if (language === 'cpp' || language === 'c') {
        const outputPath = `${filePath}.out`;
        const compiler = language === 'cpp' ? 'g++' : 'gcc';
        const compileCommand = `${compiler} "${filePath}" -o "${outputPath}"`;
        console.log(`   | Compiling with command: ${compileCommand}`);
        
        try {
            execSync(compileCommand);
            console.log(`   | Compilation successful. Output executable: ${outputPath}`);
        } catch (error) {
            console.error(`   | !!! Compilation Failed !!!`);
            console.error(`   | Stderr: ${error.stderr.toString()}`);
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
    console.log(`   | Executing command: ${command} ${args.join(' ')}`);
    const timeout = 10 * 1000;
    const child = spawn(command, args);
    let output = '';
    let stderr = '';

    const timer = setTimeout(() => {
        child.kill('SIGTERM');
        console.log(`   | !!! Process timed out after 10 seconds. Killing process. !!!`);
    }, timeout);

    console.log(`   | Writing stdin to process...`);
    child.stdin.write(stdin || '');
    child.stdin.end();
    console.log(`   | stdin stream ended.`);

    child.stdout.on('data', (data) => {
        console.log(`   | stdout chunk received: "${data.toString().trim()}"`);
        output += data.toString();
    });
    child.stderr.on('data', (data) => {
        console.log(`   | stderr chunk received: "${data.toString().trim()}"`);
        stderr += data.toString();
    });

    child.on('close', (code, signal) => {
        console.log(`   | Process finished.`);
        console.log(`   | Exit code: ${code}, Signal: ${signal}`);
        clearTimeout(timer);
        cleanup(filesToDelete);

        const responsePayload = {
            output: output,
            stderr: stderr,
            exitCode: code,
            signal: signal
        };

        if (signal === 'SIGTERM') {
            responsePayload.error = `Execution timed out after 10 seconds.`;
            return res.status(500).json(responsePayload);
        }
        res.json(responsePayload);
    });

     child.on('error', (err) => {
        console.error(`   | !!! Failed to spawn process !!!`);
        console.error(`   | Error: ${err.message}`);
        clearTimeout(timer);
        cleanup(filesToDelete);
        res.status(500).json({ error: 'Failed to start execution process.', stderr: err.message });
    });
}

function cleanup(files) {
    console.log(`   | Cleaning up files: ${files.join(', ')}`);
    files.forEach(file => {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
    });
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

