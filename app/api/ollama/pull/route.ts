import { NextRequest, NextResponse } from 'next/server';

// モデルのダウンロード状況を確認するエンドポイント
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');
    
    if (model) {
      // 特定のモデルの状況を確認
      const downloadInfo = downloadStatus.get(model);
      
      // Ollama API で利用可能モデル一覧を取得
      const customOllamaUrl = searchParams.get('ollamaUrl');
      const ollamaUrl = customOllamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
      const response = await fetch(`${ollamaUrl}/api/tags`);
      let isInstalled = false;
      
      if (response.ok) {
        const data = await response.json();
        const installedModels = data.models || [];
        isInstalled = installedModels.some((m: any) => 
          m.name === model || m.name.startsWith(model + ':')
        );
      }

      return NextResponse.json({
        model: model,
        installed: isInstalled,
        downloadStatus: downloadInfo || null
      });
    } else {
      // 全アクティブダウンロードを取得
      const activeDownloads = Array.from(downloadStatus.entries())
        .filter(([_, status]) => status.status === 'downloading')
        .map(([modelName, _]) => modelName);
        
      return NextResponse.json({
        activeDownloads,
        downloadTasks: Array.from(downloadStatus.entries()).map(([modelName, status]) => ({
          model: modelName,
          ...status
        }))
      });
    }

  } catch (error) {
    console.error('Error checking model status:', error);
    return NextResponse.json(
      { error: 'ダウンロード状況の確認に失敗しました' },
      { status: 500 }
    );
  }
}

// バックグラウンドダウンロード状態を管理するマップ
const downloadStatus = new Map<string, {
  status: 'downloading' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  completed?: number;
  total?: number;
}>();

export async function POST(request: NextRequest) {
  try {
    const { model, background = false, ollamaUrl: customOllamaUrl } = await request.json();
    const ollamaUrl = customOllamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
    
    if (!model) {
      return NextResponse.json(
        { error: 'モデル名が指定されていません' },
        { status: 400 }
      );
    }

    console.log(`Starting model pull for: ${model} (background: ${background})`);

    if (background) {
      // バックグラウンドダウンロードの場合
      downloadStatus.set(model, { status: 'downloading', progress: 0 });
      
      // 非同期でダウンロードを開始
      startBackgroundDownload(model, ollamaUrl);
      
      return NextResponse.json({
        success: true,
        message: `モデル '${model}' のバックグラウンドダウンロードを開始しました`,
        model: model,
        background: true
      });
    }

    // 従来の同期ダウンロード
    const response = await fetch(`${ollamaUrl}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: model,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ollama pull failed: ${response.status} - ${errorText}`);
      
      return NextResponse.json(
        { 
          error: 'モデルのダウンロードに失敗しました',
          details: errorText,
          status: response.status
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log(`Model pull completed for: ${model}`, result);

    return NextResponse.json({
      success: true,
      message: `モデル '${model}' のダウンロードが完了しました`,
      model: model,
      result: result
    });

  } catch (error) {
    console.error('Error in model pull:', error);
    
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// バックグラウンドダウンロードを実行する関数
async function startBackgroundDownload(model: string, ollamaUrl: string) {
  try {
    console.log(`Starting background download for: ${model}`);
    
    const response = await fetch(`${ollamaUrl}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: model,
        stream: true // ストリーミングで進捗を取得
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Background download failed for ${model}:`, errorText);
      downloadStatus.set(model, { 
        status: 'failed', 
        error: `ダウンロードに失敗しました: ${errorText}` 
      });
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      downloadStatus.set(model, { 
        status: 'failed', 
        error: 'ストリームの読み取りに失敗しました' 
      });
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            
            // 進捗情報を更新
            if (data.completed !== undefined && data.total !== undefined) {
              const progress = Math.round((data.completed / data.total) * 100);
              downloadStatus.set(model, {
                status: 'downloading',
                progress: progress,
                completed: data.completed,
                total: data.total
              });
              console.log(`Download progress for ${model}: ${progress}%`);
            }
            
            // ダウンロード完了
            if (data.status === 'success' || (data.completed && data.completed === data.total)) {
              downloadStatus.set(model, { status: 'completed', progress: 100 });
              console.log(`Background download completed for: ${model}`);
              break;
            }
          } catch (e) {
            console.warn('Failed to parse progress data:', line);
          }
        }
      }
    }

  } catch (error) {
    console.error(`Background download error for ${model}:`, error);
    downloadStatus.set(model, { 
      status: 'failed', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

