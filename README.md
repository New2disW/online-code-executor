# Online Code Execution Engine

A full-stack web application that securely compiles and executes user-submitted code snippets in Python, C++, C, and JavaScript — similar to platforms like LeetCode. Now with an **AI-powered debugging agent** built on the Gemini API.

**[🔗 Live Demo](https://online-code-executor.onrender.com)**

---

## Features

- **Multi-Language Support:** Executes code in Python, JavaScript, C, and C++.
- **Secure Sandboxing:** Uses Node.js `child_process` to isolate user code from the server.
- **Timeout Protection:** Automatically kills processes that exceed 10 seconds to prevent infinite loops.
- **🤖 AI Debug Agent:** A `POST /api/v1/debug` endpoint powered by Gemini that acts as a Senior AI Engineer — it analyzes failed code submissions and returns a structured JSON response with a bug explanation and a corrected version of the code.
- **Clean UI:** Responsive interface built with Tailwind CSS and the Monaco editor (same engine as VS Code).

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/execute` | Executes a code snippet and returns stdout/stderr |
| `POST` | `/api/v1/debug` | AI agent that diagnoses and fixes failed code |

### `/api/v1/debug` — Example

**Request:**
```json
{
  "language": "python",
  "code": "print(1/0)",
  "error_message": "ZeroDivisionError: division by zero"
}
```

**Response:**
```json
{
  "explanation": "The code attempts to divide by zero, which is undefined.",
  "fixed_code": "divisor = 1\nif divisor != 0:\n    print(1 / divisor)"
}
```

---

## Technology Stack

- **Backend:** Node.js, Express.js
- **AI:** Google Gemini API (`@google/generative-ai`)
- **Frontend:** HTML, Tailwind CSS, JavaScript (Fetch API)
- **Core Logic:** Node.js `child_process` (`spawn`, `execSync`)

---

## How to Run Locally

1. Clone the repo: `git clone https://github.com/New2disW/online-code-executor.git`
2. Install dependencies: `npm install`
3. Create a `.env` file and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_key_here
   ```
4. Start the server: `npm start`
5. Open `http://localhost:3000`
