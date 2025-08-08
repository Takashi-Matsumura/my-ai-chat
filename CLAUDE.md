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
- **Frontend**: React with unified `sendMessage` function for streaming chat interface
- **Backend**: Next.js API route (`/api/chat`) with model-aware custom streaming for all models
- **Styling**: Tailwind CSS with custom CSS animations (thinking-dots, pulse-glow, wave-loading)
- **AI Integration**: Uses `@ai-sdk/openai` configured to connect to Ollama
- **Model Detection**: `isThinkingModel()` utility for proper model-specific processing
- **Thinking Support**: Custom streaming implementation for gpt-oss models with thinking process visualization
- **File Attachment Support**: Image and text file upload with Base64 encoding and analysis
- **Proxy Support**: Server-side proxy handling for corporate environments
- **Environment Detection**: Automatic Docker/development environment switching
- **Loading Animations**: Beautiful visual feedback during response generation
- **Settings Access**: Header settings button for easy access to configuration
- **Data Storage**: Client-side localStorage for all settings and chat data

### Key Files
- `app/page.tsx` - Main chat interface with unified `sendMessage` function and model-aware streaming
- `app/api/chat/route.ts` - API endpoint with custom streaming for all models (thinking vs standard)
- `app/utils/modelUtils.ts` - Model detection utility (`isThinkingModel()`) for proper processing
- `app/utils/environment.ts` - Environment detection and automatic Ollama URL switching
- `app/components/ModelInfoDialog.tsx` - Model metadata and technical specifications display
- `app/api/ollama/models/[modelName]/route.ts` - API endpoint for fetching detailed model information
- `app/layout.tsx` - Root layout with system fonts and metadata
- `app/contexts/OllamaContext.tsx` - Ollama server management and dynamic switching
- `app/contexts/ProxyContext.tsx` - Proxy settings management
- `app/contexts/ThreadContext.tsx` - Chat thread management with localStorage persistence
- `app/components/ModelManager.tsx` - LLM model installation/removal management (simplified)
- `app/components/OllamaSettingsDialog.tsx` - Ollama server configuration UI
- `app/components/ProxySettingsDialog.tsx` - Proxy configuration UI
- `app/api/ollama/test/route.ts` - Server-side Ollama connection testing
- `app/globals.css` - Custom CSS animations (thinking-dots, pulse-glow, wave-loading, typing-indicator)

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
1. User input handled by unified `sendMessage` function with model-aware processing
2. Model type detection using `isThinkingModel(modelName)` utility function
3. Messages sent to `/api/chat` endpoint with custom streaming for all models
4. **gpt-oss models**: Two-phase streaming (thinking -> content) with type-specific data format
5. **Standard models**: Direct content streaming with simplified data format
6. Frontend processes streaming data based on model type:
   - Thinking models: Display thinking section + content with special UI
   - Standard models: Display content directly with loading animations
7. Beautiful loading animations during response generation (purple theme)
8. File attachments processed and included in message context
9. Server-side connection testing available via `/api/ollama/test` to bypass CORS issues
10. Environment-aware Ollama URL selection (Docker vs development)

### Initial User Setup
New users can access settings via the header settings button (⚙️) and configure:
1. **Ollama Server URL**: Configure connection to local or remote Ollama server
   - Environment auto-detection: Docker (`host.docker.internal:11434`) vs Development (`localhost:11434`)
   - Real-time server switching without app restart
2. **Proxy Settings**: Configure corporate proxy if in enterprise environment
3. **Model Management**: Install/uninstall LLM models directly from the application
4. **Model Selection**: Header dropdown for quick model switching during chat

All settings are stored in browser localStorage and must be configured per user/browser.

### Model-Aware Processing
**Critical Implementation**: The application uses `isThinkingModel()` function to distinguish between:
- **gpt-oss models**: Support thinking process visualization with two-phase streaming
- **Standard models**: Direct content display without thinking sections

This ensures proper display for all model types (gemma2, mistral, llama, etc.) without processing conflicts.