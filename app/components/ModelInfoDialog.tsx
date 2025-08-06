'use client';

import { useState, useEffect } from 'react';
import { useOllama } from '../contexts/OllamaContext';

interface ModelMetadata {
  name: string;
  architecture: string;
  parameterCount: number;
  parameterSize: string;
  quantizationLevel: string;
  format: string;
  contextLength?: number;
  attentionHeads?: number;
  kvHeads?: number;
  layers?: number;
  embeddingDimension?: number;
  expertCount?: number;
  expertUsedCount?: number;
  slidingWindow?: number;
  ropeFreqBase?: number;
  ropeScalingFactor?: number;
  ropeOriginalContextLength?: number;
  license?: string;
}

interface ModelInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  modelName: string;
}

export default function ModelInfoDialog({ isOpen, onClose, modelName }: ModelInfoDialogProps) {
  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (isOpen && modelName) {
      fetchModelMetadata();
    }
  }, [isOpen, modelName]);

  const fetchModelMetadata = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/ollama/models/${encodeURIComponent(modelName)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch model metadata');
      }
      const data = await response.json();
      setMetadata(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

  const formatContextLength = (length?: number): string => {
    if (!length) return 'N/A';
    if (length >= 1024) return `${(length / 1024).toFixed(0)}K tokens`;
    return `${length} tokens`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">モデル情報</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
              ×
            </button>
          </div>

          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-center py-4">
              エラー: {error}
            </div>
          )}

          {metadata && (
            <div className="space-y-6">
              {/* 基本情報 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-1">基本情報</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600 text-sm">モデル名:</span>
                    <div className="font-mono text-sm bg-gray-100 p-2 rounded">{metadata.name}</div>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">アーキテクチャ:</span>
                    <div className="font-semibold">{metadata.architecture}</div>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">パラメータ数:</span>
                    <div className="font-semibold">{formatNumber(metadata.parameterCount)} ({metadata.parameterSize})</div>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">量子化レベル:</span>
                    <div className="font-semibold">{metadata.quantizationLevel}</div>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">ファイル形式:</span>
                    <div className="font-semibold">{metadata.format?.toUpperCase()}</div>
                  </div>
                  {metadata.license && (
                    <div>
                      <span className="text-gray-600 text-sm">ライセンス:</span>
                      <div className="font-semibold">{metadata.license}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* アーキテクチャ詳細 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-1">アーキテクチャ詳細</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {metadata.contextLength && (
                    <div>
                      <span className="text-gray-600 text-sm">コンテキストウィンドウ:</span>
                      <div className="font-semibold text-blue-600">{formatContextLength(metadata.contextLength)}</div>
                    </div>
                  )}
                  {metadata.layers && (
                    <div>
                      <span className="text-gray-600 text-sm">レイヤー数:</span>
                      <div className="font-semibold">{metadata.layers}</div>
                    </div>
                  )}
                  {metadata.attentionHeads && (
                    <div>
                      <span className="text-gray-600 text-sm">アテンションヘッド:</span>
                      <div className="font-semibold">{metadata.attentionHeads}</div>
                    </div>
                  )}
                  {metadata.kvHeads && (
                    <div>
                      <span className="text-gray-600 text-sm">Key-Valueヘッド:</span>
                      <div className="font-semibold">{metadata.kvHeads}</div>
                    </div>
                  )}
                  {metadata.embeddingDimension && (
                    <div>
                      <span className="text-gray-600 text-sm">埋め込み次元:</span>
                      <div className="font-semibold">{metadata.embeddingDimension}</div>
                    </div>
                  )}
                  {metadata.slidingWindow && (
                    <div>
                      <span className="text-gray-600 text-sm">スライディングウィンドウ:</span>
                      <div className="font-semibold">{metadata.slidingWindow}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* MoE情報 */}
              {metadata.expertCount && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-1">Mixture of Experts (MoE)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600 text-sm">Expert総数:</span>
                      <div className="font-semibold">{metadata.expertCount}</div>
                    </div>
                    {metadata.expertUsedCount && (
                      <div>
                        <span className="text-gray-600 text-sm">使用Expert数:</span>
                        <div className="font-semibold">{metadata.expertUsedCount}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* RoPE設定 */}
              {(metadata.ropeFreqBase || metadata.ropeScalingFactor || metadata.ropeOriginalContextLength) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-1">RoPE設定</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {metadata.ropeFreqBase && (
                      <div>
                        <span className="text-gray-600 text-sm">基本周波数:</span>
                        <div className="font-semibold">{metadata.ropeFreqBase.toLocaleString()}</div>
                      </div>
                    )}
                    {metadata.ropeScalingFactor && (
                      <div>
                        <span className="text-gray-600 text-sm">スケーリング係数:</span>
                        <div className="font-semibold">{metadata.ropeScalingFactor}</div>
                      </div>
                    )}
                    {metadata.ropeOriginalContextLength && (
                      <div>
                        <span className="text-gray-600 text-sm">元のコンテキスト長:</span>
                        <div className="font-semibold">{formatContextLength(metadata.ropeOriginalContextLength)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}