import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { threads } = await req.json();
    
    if (!threads || !Array.isArray(threads)) {
      return Response.json(
        { error: 'Invalid threads data' },
        { status: 400 }
      );
    }

    // エクスポートデータの構造
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      threadCount: threads.length,
      threads: threads.map(thread => ({
        id: thread.id,
        title: thread.title,
        messages: thread.messages,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        model: thread.model,
      })),
    };

    // JSONファイルのファイル名を生成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `chat-export-${timestamp}.json`;

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}