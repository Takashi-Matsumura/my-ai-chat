import { NextResponse } from 'next/server';

export async function GET() {
  // 環境変数またはデフォルト値を取得
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  
  return NextResponse.json({
    url: ollamaUrl,
    isDefault: !process.env.OLLAMA_URL
  });
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      );
    }

    // URL形式の検証
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // この実装では実際には環境変数を変更せず、
    // フロントエンドでlocalStorageを使用して管理
    // 本来なら設定ファイルやデータベースに保存する必要があります
    
    return NextResponse.json({
      success: true,
      message: 'URL設定が保存されました（注：サーバー再起動後は環境変数の設定が使用されます）'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}