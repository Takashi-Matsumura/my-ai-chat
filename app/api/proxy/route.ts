import { NextResponse } from 'next/server';

export async function GET() {
  // 環境変数からプロキシ設定を取得
  const proxySettings = {
    httpProxy: process.env.HTTP_PROXY || process.env.http_proxy || '',
    httpsProxy: process.env.HTTPS_PROXY || process.env.https_proxy || '',
    noProxy: process.env.NO_PROXY || process.env.no_proxy || 'localhost,127.0.0.1,::1,host.docker.internal',
    enabled: !!(process.env.HTTP_PROXY || process.env.http_proxy || process.env.HTTPS_PROXY || process.env.https_proxy),
  };

  return NextResponse.json(proxySettings);
}