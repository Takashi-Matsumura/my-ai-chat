import { NextResponse } from 'next/server';
import { OLLAMA_MODELS_MASTER, OllamaModelMaster } from '../../../data/ollama-models';

export interface AvailableModel extends OllamaModelMaster {
  installed: boolean;
}

export async function GET() {
  try {
    // Ollama API で現在インストール済みのモデル一覧を取得
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const response = await fetch(`${ollamaUrl}/api/tags`);
    
    let installedModels: string[] = [];
    
    if (response.ok) {
      const data = await response.json();
      installedModels = (data.models || []).map((m: any) => m.name);
    } else {
      console.warn('Ollamaサーバーに接続できませんが、マスターデータは返します');
    }

    // マスターデータとインストール状況を組み合わせ
    const availableModels: AvailableModel[] = OLLAMA_MODELS_MASTER.map(masterModel => {
      // インストール済みモデル名との照合（部分一致も考慮）
      const installed = installedModels.some(installedName => 
        installedName === masterModel.name || 
        installedName.startsWith(masterModel.name + ':') ||
        masterModel.name.startsWith(installedName)
      );

      return {
        ...masterModel,
        installed
      };
    });

    return NextResponse.json({
      success: true,
      models: availableModels,
      installedCount: availableModels.filter(m => m.installed).length,
      totalCount: availableModels.length
    });

  } catch (error) {
    console.error('Error fetching available models:', error);
    
    // エラーが発生してもマスターデータは返す
    const fallbackModels: AvailableModel[] = OLLAMA_MODELS_MASTER.map(masterModel => ({
      ...masterModel,
      installed: false
    }));

    return NextResponse.json({
      success: false,
      error: 'モデル情報の取得に失敗しましたが、利用可能モデル一覧を表示します',
      models: fallbackModels,
      installedCount: 0,
      totalCount: fallbackModels.length
    });
  }
}