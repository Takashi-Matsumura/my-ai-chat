import { NextRequest, NextResponse } from 'next/server';

interface ModelDetails {
  parent_model?: string;
  format: string;
  family: string;
  families: string[];
  parameter_size: string;
  quantization_level: string;
}

interface ModelInfo {
  [key: string]: any;
  'general.architecture'?: string;
  'general.parameter_count'?: number;
  'gptoss.context_length'?: number;
  'gptoss.attention.head_count'?: number;
  'gptoss.attention.head_count_kv'?: number;
  'gptoss.block_count'?: number;
  'gptoss.embedding_length'?: number;
  'gptoss.expert_count'?: number;
  'gptoss.expert_used_count'?: number;
  'gptoss.attention.sliding_window'?: number;
  'gptoss.rope.freq_base'?: number;
  'gptoss.rope.scaling.factor'?: number;
  'gptoss.rope.scaling.original_context_length'?: number;
}

interface OllamaModelResponse {
  details: ModelDetails;
  model_info: ModelInfo;
  license?: string;
  modelfile?: string;
}

interface ProcessedModelMetadata {
  name: string;
  architecture: string;
  parameterCount: number;
  parameterSize: string;
  quantizationLevel: string;
  format: string;
  contextLength?: number;
  attentionHeads?: number;
  kvHeads?: number;
  layers?: number;
  embeddingDimension?: number;
  expertCount?: number;
  expertUsedCount?: number;
  slidingWindow?: number;
  ropeFreqBase?: number;
  ropeScalingFactor?: number;
  ropeOriginalContextLength?: number;
  license?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { modelName: string } }
) {
  try {
    const { modelName } = params;
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    
    // Ollama APIからモデル詳細情報を取得
    const response = await fetch(`${ollamaUrl}/api/show`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: modelName,
        verbose: true
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch model information' },
        { status: response.status }
      );
    }

    const data: OllamaModelResponse = await response.json();
    
    // メタデータを整理して返す
    const metadata: ProcessedModelMetadata = {
      name: modelName,
      architecture: data.model_info?.['general.architecture'] || 'unknown',
      parameterCount: data.model_info?.['general.parameter_count'] || 0,
      parameterSize: data.details.parameter_size,
      quantizationLevel: data.details.quantization_level,
      format: data.details.format,
      contextLength: data.model_info?.['gptoss.context_length'],
      attentionHeads: data.model_info?.['gptoss.attention.head_count'],
      kvHeads: data.model_info?.['gptoss.attention.head_count_kv'],
      layers: data.model_info?.['gptoss.block_count'],
      embeddingDimension: data.model_info?.['gptoss.embedding_length'],
      expertCount: data.model_info?.['gptoss.expert_count'],
      expertUsedCount: data.model_info?.['gptoss.expert_used_count'],
      slidingWindow: data.model_info?.['gptoss.attention.sliding_window'],
      ropeFreqBase: data.model_info?.['gptoss.rope.freq_base'],
      ropeScalingFactor: data.model_info?.['gptoss.rope.scaling.factor'],
      ropeOriginalContextLength: data.model_info?.['gptoss.rope.scaling.original_context_length'],
      license: data.license ? 'Apache License 2.0' : undefined, // ライセンステキストが長すぎるため簡略化
    };

    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Error fetching model metadata:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}