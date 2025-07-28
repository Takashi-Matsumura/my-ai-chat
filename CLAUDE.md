# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server (Next.js)
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Architecture Overview

This is a Next.js 14+ chat application using the AI SDK to interface with Ollama (local LLM server). The architecture follows Next.js App Router patterns:

### Core Structure
- **Frontend**: React with AI SDK hooks (`@ai-sdk/react`) for streaming chat interface
- **Backend**: Next.js API route (`/api/chat`) handling streaming responses from local Ollama
- **Styling**: Tailwind CSS with minimal custom styling
- **AI Integration**: Uses `@ai-sdk/openai` configured to connect to Ollama at `http://localhost:11434/v1`

### Key Files
- `app/page.tsx` - Main chat interface using `useChat` hook
- `app/api/chat/route.ts` - API endpoint that proxies requests to Ollama (gemma3 model)
- `app/layout.tsx` - Root layout with Inter font and metadata

### Dependencies
- AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`) for LLM integration
- Next.js with TypeScript
- Tailwind CSS for styling

### Local Development Requirements
- Ollama must be running locally on port 11434 with gemma3 model available
- The app expects Ollama's OpenAI-compatible API endpoint at `http://localhost:11434/v1`

### Chat Flow
1. User input handled by `useChat` hook in frontend
2. Messages sent to `/api/chat` endpoint
3. Backend streams response from Ollama using `streamText`
4. Frontend displays streaming response with loading states and error handling