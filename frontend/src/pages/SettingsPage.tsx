import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Cpu, Key, Shield, CheckCircle2, Save } from 'lucide-react';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [config, setConfig] = useState<any | null>(null);
  const [provider, setProvider] = useState('auto');
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [openaiKey, setOpenaiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getSettings().then((data) => {
      setConfig(data);
      setProvider(data.ai_provider || 'auto');
      setGeminiModel(data.gemini_model || 'gemini-2.5-flash');
      setOpenaiModel(data.openai_model || 'gpt-4o-mini');
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateSettings({
        AI_PROVIDER: provider,
        GEMINI_API_KEY: geminiKey || undefined,
        GEMINI_MODEL: geminiModel,
        OPENAI_API_KEY: openaiKey || undefined,
        OPENAI_MODEL: openaiModel
      });
      const updated = await api.getSettings();
      setConfig(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e: any) {
      alert(`Save failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-indigo-600" />
          System Settings & AI Orchestration
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure model connectors, API keys, and sandboxed execution thresholds.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Configuration saved successfully.</span>
        </div>
      )}

      {/* Active Provider Status Banner */}
      {config && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs space-y-1">
          <div className="font-bold text-indigo-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <span>Active Inference Engine: {config.active_provider_info?.provider?.toUpperCase()}</span>
          </div>
          <p className="text-slate-600 text-[11px]">
            Model: <code>{config.active_provider_info?.model}</code> &bull; Configured: {config.active_provider_info?.configured ? 'Yes' : 'Using Local Deterministic Correlator'}
          </p>
          {config.active_provider_info?.note && (
            <p className="text-indigo-700 text-[10px] italic">{config.active_provider_info.note}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-600" />
            AI Provider Credentials (Optional)
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            LegacyLens AI functions out-of-the-box with its built-in deterministic AST correlator. You can optionally configure Gemini or OpenAI API keys for cloud model synthesis. Keys are stored in environment memory and never hardcoded.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Provider Strategy</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="auto">Auto (Prefer Gemini &bull; Fallback to Local)</option>
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="local_heuristic">Deterministic Local Engine Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gemini Model</label>
              <input
                type="text"
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gemini API Key</label>
              <input
                type="password"
                placeholder={config?.gemini_configured ? '••••••••••••••••' : 'AIzaSy...'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">OpenAI API Key</label>
              <input
                type="password"
                placeholder={config?.openai_configured ? '••••••••••••••••' : 'sk-...'}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>
        </div>

        {/* Security & Isolation Limits */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            Execution Sandbox & Protection Thresholds
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Max Upload Limit</span>
              <span className="font-semibold text-slate-800">{config?.limits?.max_upload_mb || 100} MB</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Max Extracted Size</span>
              <span className="font-semibold text-slate-800">{config?.limits?.max_extracted_mb || 500} MB</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Max File Count</span>
              <span className="font-semibold text-slate-800">{config?.limits?.max_files || 3000} files</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Sandbox Timeout</span>
              <span className="font-semibold text-slate-800">{config?.limits?.sandbox_timeout_sec || 30}s</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
