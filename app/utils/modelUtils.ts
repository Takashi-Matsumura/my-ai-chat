/**
 * モデル関連のユーティリティ関数
 */

/**
 * 指定されたモデルがThinkingモードをサポートしているかどうかを判定
 * @param modelName モデル名
 * @returns Thinkingモードをサポートしているかどうか
 */
export function isThinkingModel(modelName: string): boolean {
  if (!modelName) return false;
  
  // gpt-ossで始まるモデルはThinkingモードをサポート
  return modelName.toLowerCase().includes('gpt-oss');
}

/**
 * モデル名を正規化（大文字小文字を統一）
 * @param modelName モデル名
 * @returns 正規化されたモデル名
 */
export function normalizeModelName(modelName: string): string {
  return modelName?.toLowerCase() || '';
}

/**
 * モデルタイプを取得
 * @param modelName モデル名
 * @returns モデルタイプ
 */
export function getModelType(modelName: string): 'thinking' | 'standard' {
  return isThinkingModel(modelName) ? 'thinking' : 'standard';
}