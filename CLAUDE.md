# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server (Next.js)
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Docker Commands

- `docker-compose up -d` - Start containers in background
- `docker-compose down` - Stop and remove containers
- `docker-compose logs` - View container logs
- `docker-compose up -d --build` - Rebuild and start containers

## Architecture Overview

This is a Next.js 14+ chat application using the AI SDK to interface with Ollama (local LLM server). The architecture follows Next.js App Router patterns:

### Core Structure
- **Frontend**: React with AI SDK hooks (`@ai-sdk/react`) for streaming chat interface
- **Backend**: Next.js API route (`/api/chat`) handling streaming responses from local Ollama
- **Styling**: Tailwind CSS with minimal custom styling
- **AI Integration**: Uses `@ai-sdk/openai` configured to connect to Ollama
- **Proxy Support**: Server-side proxy handling for corporate environments
- **Environment Configuration**: Environment variable support via `.env.local`

### Key Files
- `app/page.tsx` - Main chat interface using `useChat` hook
- `app/api/chat/route.ts` - API endpoint that proxies requests to Ollama with environment variable support
- `app/layout.tsx` - Root layout with system fonts and metadata
- `app/contexts/OllamaContext.tsx` - Ollama server management and dynamic switching
- `app/contexts/ProxyContext.tsx` - Proxy settings management
- `app/components/OllamaSettingsDialog.tsx` - Ollama server configuration UI
- `app/components/ProxySettingsDialog.tsx` - Proxy configuration UI
- `app/api/ollama/test/route.ts` - Server-side Ollama connection testing

### Dependencies
- AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`) for LLM integration
- Next.js with TypeScript
- Tailwind CSS for styling

### Local Development Requirements
- Ollama must be running locally on port 11434 with any supported model available
- The app expects Ollama's OpenAI-compatible API endpoint at `http://localhost:11434/v1`
- For corporate proxy environments, configure proxy settings in `.env.local`

### Environment Configuration
The application supports environment variable configuration via `.env.local`:

```bash
# Ollama Configuration
OLLAMA_URL=http://localhost:11434

# Proxy Settings (for corporate environments)
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1,::1,host.docker.internal

# Development Settings
PORT=3000
```

### Docker Deployment
- **Application Port**: 65010 (configurable via docker-compose.yml)
- **Ollama API Port**: 65434 (external access to Docker Ollama)
- **Network**: Uses `host.docker.internal` for container-to-host communication
- **Environment Variables**: Automatically inherited from host environment

### Chat Flow
1. User input handled by `useChat` hook in frontend
2. Messages sent to `/api/chat` endpoint
3. Backend streams response from Ollama using `streamText` with configurable Ollama URL
4. Frontend displays streaming response with loading states and error handling
5. Server-side connection testing available via `/api/ollama/test` to bypass CORS issues