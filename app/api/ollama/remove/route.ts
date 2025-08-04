import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    const { model } = await request.json();
    
    if (!model) {
      return NextResponse.json(
        { error: 'モデル名が指定されていません' },
        { status: 400 }
      );
    }

    console.log(`Starting model removal for: ${model}`);

    // Ollama API にモデル削除リクエストを送信
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const response = await fetch(`${ollamaUrl}/api/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: model
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ollama delete failed: ${response.status} - ${errorText}`);
      
      return NextResponse.json(
        { 
          error: 'モデルのアンインストールに失敗しました',
          details: errorText,
          status: response.status
        },
        { status: response.status }
      );
    }

    // 削除成功の場合、レスポンスボディが空の場合がある
    let result = {};
    try {
      const text = await response.text();
      if (text) {
        result = JSON.parse(text);
      }
    } catch (e) {
      // JSONパースエラーは無視（削除成功時は空レスポンスの場合がある）
    }

    console.log(`Model removal completed for: ${model}`, result);

    return NextResponse.json({
      success: true,
      message: `モデル '${model}' のアンインストールが完了しました`,
      model: model,
      result: result
    });

  } catch (error) {
    console.error('Error in model removal:', error);
    
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// モデルのアンインストール状況を確認するエンドポイント
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    
    if (!model) {
      return NextResponse.json(
        { error: 'モデル名が指定されていません' },
        { status: 400 }
      );
    }

    // Ollama API で利用可能モデル一覧を取得
    const response = await fetch(`${ollamaUrl}/api/tags`);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Ollamaサーバーに接続できません' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const installedModels = data.models || [];
    
    // 指定されたモデルがまだインストールされているかチェック
    const isStillInstalled = installedModels.some((m: any) => 
      m.name === model || m.name.startsWith(model + ':')
    );

    return NextResponse.json({
      model: model,
      installed: isStillInstalled,
      installedModels: installedModels.map((m: any) => m.name)
    });

  } catch (error) {
    console.error('Error checking model removal status:', error);
    
    return NextResponse.json(
      { 
        error: 'モデル状況の確認に失敗しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}