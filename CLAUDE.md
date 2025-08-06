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
- **Thinking Support**: Custom streaming implementation for gpt-oss models with thinking process visualization
- **Proxy Support**: Server-side proxy handling for corporate environments
- **Environment Configuration**: Environment variable support via `.env.local`
- **Data Storage**: Client-side localStorage for all settings and chat data

### Key Files
- `app/page.tsx` - Main chat interface using `useChat` hook with dual support for standard and thinking models
- `app/api/chat/route.ts` - API endpoint that proxies requests to Ollama with thinking support for gpt-oss models
- `app/hooks/useThinkingChat.ts` - Custom chat hook for models with thinking process support
- `app/components/ModelInfoDialog.tsx` - Model metadata and technical specifications display
- `app/api/ollama/models/[modelName]/route.ts` - API endpoint for fetching detailed model information
- `app/layout.tsx` - Root layout with system fonts and metadata
- `app/contexts/OllamaContext.tsx` - Ollama server management and dynamic switching
- `app/contexts/ProxyContext.tsx` - Proxy settings management
- `app/contexts/ThreadContext.tsx` - Chat thread management with localStorage persistence
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
OLLAMA_URL=http://host.docker.internal:11434

# Proxy Settings (for corporate environments)
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1,::1,host.docker.internal

# Development Settings
PORT=3000
```

### Docker Deployment
- **Application Port**: 8888 (configurable via docker-compose.yml)
- **Ollama Server**: Runs on host machine port 11434
- **Network**: Uses `host.docker.internal` for container-to-host communication
- **Environment Variables**: Automatically inherited from host environment via `.env.local`

### Data Storage and Security
- **Settings Storage**: All user settings stored in browser localStorage
- **Chat Data**: All chat history stored in browser localStorage
- **Server Storage**: No sensitive data stored on server side
- **Privacy**: Each user's settings are isolated and private to their browser

### Chat Flow
1. User input handled by `useChat` hook (standard models) or `useThinkingChat` hook (gpt-oss models) in frontend
2. Messages sent to `/api/chat` endpoint with model-specific routing
3. For gpt-oss models: Custom streaming implementation fetches thinking process first, then streams content
4. For standard models: Backend streams response from Ollama using `streamText` with configurable Ollama URL
5. Frontend displays streaming response with loading states, error handling, and thinking process visualization
6. Server-side connection testing available via `/api/ollama/test` to bypass CORS issues

### Initial User Setup
New users must configure two settings on first access:
1. **Ollama Server URL**: Configure connection to local or remote Ollama server
2. **Proxy Settings**: Configure corporate proxy if in enterprise environment

All settings are stored in browser localStorage and must be configured per user/browser.