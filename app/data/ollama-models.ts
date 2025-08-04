// Ollamaで利用可能な人気LLMモデルのマスターデータ
export interface OllamaModelMaster {
  name: string;
  displayName: string;
  description: string;
  size: string;
  capabilities: string[];
  recommended?: boolean;
}

export const OLLAMA_MODELS_MASTER: OllamaModelMaster[] = [
  // 小型・高速モデル
  {
    name: 'gemma2:2b',
    displayName: 'Gemma 2 2B',
    description: 'Googleの軽量モデル。高速で効率的',
    size: '1.6GB',
    capabilities: ['テキスト生成', '質問応答'],
    recommended: true
  },
  {
    name: 'phi3.5:latest',
    displayName: 'Phi 3.5',
    description: 'Microsoftの小型モデル。軽量で高性能',
    size: '2.2GB',
    capabilities: ['テキスト生成', '質問応答', 'コード生成']
  },
  {
    name: 'qwen2:1.5b',
    displayName: 'Qwen2 1.5B',
    description: 'Alibabaの軽量モデル。多言語対応',
    size: '0.9GB',
    capabilities: ['テキスト生成', '多言語対応']
  },

  // 中型・バランス型モデル
  {
    name: 'llama3.2:3b',
    displayName: 'Llama 3.2 3B',
    description: 'Metaの中型モデル。汎用性が高い',
    size: '2.0GB',
    capabilities: ['テキスト生成', '質問応答', '要約']
  },
  {
    name: 'mistral:7b',
    displayName: 'Mistral 7B',
    description: 'Mistral AIの高性能モデル',
    size: '4.1GB',
    capabilities: ['テキスト生成', '質問応答', 'コード生成']
  },
  {
    name: 'qwen2:7b',
    displayName: 'Qwen2 7B',
    description: 'Alibabaの中型モデル。多言語・多モーダル対応',
    size: '4.4GB',
    capabilities: ['テキスト生成', '多言語対応', '推論']
  },

  // 大型・高性能モデル
  {
    name: 'llama3.1:8b',
    displayName: 'Llama 3.1 8B',
    description: 'Metaの高性能モデル。複雑なタスクに対応',
    size: '4.7GB',
    capabilities: ['テキスト生成', '質問応答', '推論', 'コード生成']
  },

  // 専門特化モデル
  {
    name: 'codellama:7b',
    displayName: 'Code Llama 7B',
    description: 'プログラミング特化モデル',
    size: '3.8GB',
    capabilities: ['コード生成', 'コード説明', 'デバッグ支援']
  },
  {
    name: 'deepseek-coder:6.7b',
    displayName: 'DeepSeek Coder 6.7B',
    description: 'コーディング専用の高性能モデル',
    size: '3.8GB',
    capabilities: ['コード生成', 'コードレビュー', 'リファクタリング']
  },
  {
    name: 'nomic-embed-text:latest',
    displayName: 'Nomic Embed Text',
    description: 'テキスト埋め込み専用モデル',
    size: '274MB',
    capabilities: ['テキスト埋め込み', 'セマンティック検索']
  },

  // 日本語特化モデル
  {
    name: 'lucas2024/llama-3-elyza-jp-8b:q5_k_m',
    displayName: 'ELYZA-JP 8B',
    description: '日本語に特化したLlama 3ベースモデル。GPT-3.5相当の性能',
    size: '5.7GB',
    capabilities: ['日本語対話', 'テキスト生成', '質問応答'],
    recommended: true
  }
];

// モデルをカテゴリ別に分類
export const getModelsByCategory = () => {
  return {
    lightweight: OLLAMA_MODELS_MASTER.filter(m => 
      parseFloat(m.size) < 3 || m.size.includes('MB')
    ),
    balanced: OLLAMA_MODELS_MASTER.filter(m => 
      parseFloat(m.size) >= 3 && parseFloat(m.size) < 10
    ),
    powerful: OLLAMA_MODELS_MASTER.filter(m => 
      parseFloat(m.size) >= 10
    ),
    specialized: OLLAMA_MODELS_MASTER.filter(m => 
      m.capabilities.includes('コード生成') || 
      m.capabilities.includes('テキスト埋め込み')
    )
  };
};

// 推奨モデルのみを取得
export const getRecommendedModels = () => {
  return OLLAMA_MODELS_MASTER.filter(m => m.recommended);
};