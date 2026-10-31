import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Cpu, Key, Shield, CheckCircle2, Save, Lock, Sliders, ShieldCheck } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto space-y-6 py-2 animate-fade-in">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Engine Configuration
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-indigo-600" />
          <span>System Settings & AI Orchestration</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure model inference providers, API keys, and sandboxed security thresholds.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2.5 shadow-2xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">Configuration successfully updated and re-initialized!</span>
        </div>
      )}

      {/* Active Provider Status Banner */}
      {config && (
        <div className="p-4 bg-gradient-to-br from-indigo-50/90 to-slate-50 border border-indigo-200/90 rounded-2xl text-xs space-y-1.5 shadow-2xs">
          <div className="font-bold text-indigo-900 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
            </span>
            <Cpu className="w-4 h-4 text-indigo-600" />
            <span>Active Inference Engine: {config.active_provider_info?.provider?.toUpperCase()}</span>
          </div>
          <p className="text-slate-600 text-[11px]">
            Model: <code className="bg-white/80 px-1.5 py-0.5 rounded border border-indigo-100 font-mono text-indigo-700">{config.active_provider_info?.model}</code> &bull; Configured: {config.active_provider_info?.configured ? 'Active' : 'Using Local Deterministic Correlator'}
          </p>
          {config.active_provider_info?.note && (
            <p className="text-indigo-700 text-[10px] italic pt-0.5">{config.active_provider_info.note}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-6">
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-600" />
            <span>AI Provider Strategy & Model Keys</span>
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            LegacyLens AI operates out-of-the-box with its built-in deterministic AST correlator. You can optionally configure Gemini or OpenAI API keys for cloud model reasoning. Keys reload dynamically upon saving.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Provider Strategy</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="auto">Auto (Prefer Gemini &bull; Fallback to Local AST)</option>
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="local_heuristic">Deterministic Local Engine Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Gemini Model</label>
              <input
                type="text"
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-mono transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Gemini API Key</label>
              <input
                type="password"
                placeholder={config?.gemini_configured ? '••••••••••••••••' : 'AIzaSy...'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-mono transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">OpenAI API Key</label>
              <input
                type="password"
                placeholder={config?.openai_configured ? '••••••••••••••••' : 'sk-...'}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-mono transition-all"
              />
            </div>
          </div>
        </div>

        {/* Security & Isolation Limits */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Execution Sandbox & Protection Thresholds</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1">Max Upload Limit</span>
              <span className="font-extrabold text-slate-900 font-mono">{config?.limits?.max_upload_mb || 100} MB</span>
            </div>
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1">Max Extracted Size</span>
              <span className="font-extrabold text-slate-900 font-mono">{config?.limits?.max_extracted_mb || 500} MB</span>
            </div>
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1">Max File Count</span>
              <span className="font-extrabold text-slate-900 font-mono">{config?.limits?.max_files || 3000} files</span>
            </div>
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1">Sandbox Timeout</span>
              <span className="font-extrabold text-slate-900 font-mono">{config?.limits?.sandbox_timeout_sec || 30}s</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving Changes...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
