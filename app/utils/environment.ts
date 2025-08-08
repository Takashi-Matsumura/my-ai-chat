/**
 * 環境判定とOllama URL自動設定のユーティリティ
 */

export type Environment = 'docker' | 'development' | 'production';

/**
 * 現在の実行環境を判定する
 */
export function detectEnvironment(): Environment {
  // サーバーサイドでの判定
  if (typeof window === 'undefined') {
    // Docker環境の判定指標
    const isDocker = 
      process.env.NODE_ENV === 'production' &&
      (process.env.DOCKER === 'true' || 
       process.env.HOSTNAME?.includes('docker') ||
       process.env.IS_DOCKER === 'true');

    if (isDocker) {
      return 'docker';
    }

    return process.env.NODE_ENV === 'production' ? 'production' : 'development';
  }

  // クライアントサイドでの判定
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
  
  const isDevelopment = window.location.port === '3000' || 
                       window.location.port === '3001';

  if (isLocalhost && isDevelopment) {
    return 'development';
  }

  return 'production';
}

/**
 * 環境に応じたデフォルトOllama URLを取得
 */
export function getDefaultOllamaUrl(environment?: Environment): string {
  const env = environment || detectEnvironment();
  
  switch (env) {
    case 'docker':
      return 'http://host.docker.internal:11434';
    case 'development':
      return 'http://localhost:11434';
    case 'production':
    default:
      return 'http://localhost:11434';
  }
}

/**
 * 現在の環境情報を取得
 */
export function getEnvironmentInfo() {
  const environment = detectEnvironment();
  const defaultOllamaUrl = getDefaultOllamaUrl(environment);
  
  return {
    environment,
    defaultOllamaUrl,
    isDocker: environment === 'docker',
    isDevelopment: environment === 'development',
    isProduction: environment === 'production'
  };
}