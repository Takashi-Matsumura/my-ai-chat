import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URLが指定されていません' },
        { status: 400 }
      );
    }

    // URL形式の検証
    let testUrl: string;
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
      testUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    } catch {
      return NextResponse.json(
        { error: 'URLの形式が正しくありません' },
        { status: 400 }
      );
    }

    // プロキシ設定の確認
    const hostname = new URL(testUrl).hostname;
    const noProxy = process.env.NO_PROXY || process.env.no_proxy || 'localhost,127.0.0.1,::1,host.docker.internal';
    const noProxyList = noProxy.split(',').map(s => s.trim());
    
    // NO_PROXYリストに含まれるホストかチェック
    const shouldBypassProxy = noProxyList.some(pattern => 
      pattern === hostname || 
      hostname.endsWith(`.${pattern}`)
    );

    // Ollamaサーバーに接続テスト
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒でタイムアウト

    try {
      // NO_PROXYに含まれる場合は直接アクセス
      const fetchOptions: RequestInit = {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      };

      // デバッグ情報
      console.log('Testing connection to:', testUrl);
      console.log('Hostname:', hostname);
      console.log('NO_PROXY:', noProxy);
      console.log('Should bypass proxy:', shouldBypassProxy);

      const response = await fetch(`${testUrl}/api/tags`, fetchOptions);

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          success: true,
          message: '接続に成功しました',
          models: data.models?.length || 0
        });
      } else {
        return NextResponse.json({
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        });
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: '接続がタイムアウトしました（10秒）'
        });
      }
      
      return NextResponse.json({
        success: false,
        error: error.message || 'Ollamaサーバーに接続できませんでした'
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}