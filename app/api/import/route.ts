import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const importData = await req.json();
    
    // データの妥当性チェック
    if (!importData || typeof importData !== 'object') {
      return Response.json(
        { error: 'Invalid import data format' },
        { status: 400 }
      );
    }

    // バージョンチェック
    if (!importData.version) {
      return Response.json(
        { error: 'Missing version information' },
        { status: 400 }
      );
    }

    // スレッドデータの確認
    if (!importData.threads || !Array.isArray(importData.threads)) {
      return Response.json(
        { error: 'Invalid threads data' },
        { status: 400 }
      );
    }

    // 各スレッドの必須フィールドをチェック
    for (const thread of importData.threads) {
      if (!thread.id || !thread.title || !Array.isArray(thread.messages)) {
        return Response.json(
          { error: 'Invalid thread structure' },
          { status: 400 }
        );
      }
    }

    // インポートデータを正規化
    const normalizedThreads = importData.threads.map((thread: any) => ({
      id: thread.id,
      title: thread.title,
      messages: thread.messages || [],
      createdAt: thread.createdAt ? new Date(thread.createdAt) : new Date(),
      updatedAt: thread.updatedAt ? new Date(thread.updatedAt) : new Date(),
      model: thread.model || 'llama3.1',
    }));

    return Response.json({
      success: true,
      message: `Successfully imported ${normalizedThreads.length} threads`,
      threads: normalizedThreads,
      importDate: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Import error:', error);
    return Response.json(
      { error: 'Import failed: Invalid JSON format' },
      { status: 500 }
    );
  }
}