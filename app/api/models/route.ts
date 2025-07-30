export async function GET() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    
    if (!response.ok) {
      throw new Error('Failed to fetch models from Ollama');
    }
    
    const data = await response.json();
    
    // Extract model names from the response
    const models = data.models?.map((model: any) => ({
      name: model.name,
      size: model.size,
      modified_at: model.modified_at
    })) || [];
    
    return Response.json({ models });
  } catch (error) {
    console.error('Error fetching models:', error);
    return Response.json(
      { error: 'Failed to fetch models from Ollama' },
      { status: 500 }
    );
  }
}