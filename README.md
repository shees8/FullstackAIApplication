🤖 NOVA AI - Full-Stack AGENTIC AI Assistant

📝 Overview

NOVA AI is a complete end-to-end Agentic AI application demonstrating advanced capabilities in AI agents, full-stack development, and multimodal interactions. It features a robust architecture combining a web frontend, a backend API, and a versatile AI agent equipped with chat, voice, and image processing skills.

✨ Core Features

💬 Interactive Chat (Full-Stack AI Skill)

Real-time text-based conversational interface.

Context-aware memory and intelligent routing based on user intent.

🎙️ Real-time Voice Interaction (LiveKit Voice Skill)

Low-latency, bidirectional voice communication powered by LiveKit.

Speech-to-text and text-to-speech integration for seamless agent conversations.

🖼️ Image Attachment & Processing (Vision Skill)

Support for uploading and analyzing images.

Vision capabilities allowing the agent to "see," describe, and contextualize user-provided photos.

🏗️ Project Architecture

The application is built on a modern, decoupled architecture:

Web (Frontend): User interface for chat, voice controls, and image uploads. (e.g., Next.js / React)

API (Backend): Orchestrates requests between the frontend and the AI Agent. Manages LiveKit tokens, file uploads, and session state. (e.g., Node.js / Python FastAPI)

Agent: The core reasoning engine. Equipped with specific "Tools" or "Skills" (Chat, Voice, Vision) to execute complex user requests.

graph LR
    A[Web Client] <-->|REST/WebSockets| B(Backend API)
    B <-->|Tool Calls| C{AI Agent}
    C --> D[Chat Skill]
    C --> E[Voice Skill - LiveKit]
    C --> F[Image Processing Skill]


🛠️ Tech Stack & Agent Skills

Frontend: [Insert Framework, e.g., Next.js, TailwindCSS]

Backend: [Insert Framework, e.g., Express.js, FastAPI]

Voice/WebRTC: LiveKit

AI/LLM: [Insert Model provider, e.g., OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet]

Agent Framework: [Insert Framework if used, e.g., LangChain, LlamaIndex, or Custom]

AI Coding Assistant: Built with the assistance of [Claude Code / Codex / Cursor].

🚀 Getting Started

Prerequisites

Node.js (v18+)

Python (if applicable to your backend)

LiveKit Cloud Account (for Voice capabilities)

API Keys for your chosen LLM provider

Installation

Clone the repository:

git clone https://github.com/yourusername/your-project-name.git
cd your-project-name


Setup Frontend:

cd frontend
npm install
# Create a .env.local file and add necessary frontend variables
npm run dev


Setup Backend:

cd backend
npm install # or pip install -r requirements.txt
# Create a .env file and add LiveKit & LLM API keys
npm start # or python main.py


Environment Variables

You will need to configure the following environment variables in your .env files:

LIVEKIT_API_KEY

LIVEKIT_API_SECRET

LIVEKIT_URL

OPENAI_API_KEY (or equivalent)

🌐 Deployment

The application is deployed and accessible at:

Live Demo: [Insert Deployment Link here]

(Note: Hosted via [Vercel / Heroku / Render / AWS])

📊 Presentation / Slide Deck

A complete slide deck explaining the architecture, the Agent Skills concept, and the development journey can be found here:

Slide Deck: [Insert Link to Google Slides / Canva / PDF]

🤝 Acknowledgements

This project was developed to demonstrate a deep understanding of Agentic AI, APIs, and Full-Stack Engineering. Special thanks to the AI-assisted software engineering tools (Claude Code/Codex) that helped accelerate the development process.