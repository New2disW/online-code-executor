# Online Code Execution Engine

A full-stack web application that securely compiles and executes user-submitted code snippets in Python, C++, C, and JavaScript, similar to platforms like LeetCode.

**[[Link to Live Demo](https://online-code-executor.onrender.com)]** 


## Features

-   **Multi-Language Support:** Executes code in Python, JavaScript, C, and C++.
-   **Secure Sandboxing:** Uses Node.js `child_process` to run user code in isolated processes, preventing it from accessing the server.
-   **Timeout Protection:** Automatically terminates processes that run for more than 10 seconds to prevent infinite loops.
-   **Clean User Interface:** A modern, responsive UI built with Tailwind CSS and the Monaco editor (from VS Code).
-   **REST API:** A clear client-server architecture with a single API endpoint to handle code execution.

## Technology Stack

-   **Backend:** Node.js, Express.js
-   **Frontend:** HTML, Tailwind CSS, JavaScript (Fetch API)
-   **Core Logic:** Node.js `child_process` module (`spawn` and `execSync`)

## How to Run Locally

1.  Clone the repository: `git clone https://github.com/YourUsername/your-repository-name.git`
2.  Navigate to the project directory: `cd your-repository-name`
3.  Install dependencies: `npm install`
4.  Run the server: `node server.js`
5.  Open your browser and go to `http://localhost:3000`
