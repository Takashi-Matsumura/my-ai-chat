export async function GET() {
  try {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const response = await fetch(`${ollamaUrl}/api/tags`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models from Ollama: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract model names from the response
    const models = data.models?.map((model: any) => ({
      name: model.name,
      size: model.size,
      modified_at: model.modified_at
    })) || [];
    
    return Response.json({ 
      models,
      hasModels: models.length > 0,
      ollamaConnected: true
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    
    // Ollamaサーバーに接続できない、またはモデルがない場合
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError = errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED');
    
    return Response.json(
      { 
        error: errorMessage,
        models: [],
        hasModels: false,
        ollamaConnected: !isConnectionError
      },
      { status: isConnectionError ? 503 : 500 }
    );
  }
}