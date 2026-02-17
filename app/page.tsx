'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Settings, Server, Shuffle, Search, CloudDownload, CloudUpload, History, 
  Plus, Trash, Edit, X, RefreshCw, Menu, Check, AlertCircle, Shield, 
  Globe, Radio, List, ArrowRight, FileCode, ChevronDown, ChevronUp, Info, Terminal
} from 'lucide-react';
import axios from 'axios';
import * as Diff from 'diff';

// --- Help Data ---
const HELP_DATA: any = {
  ssh_host: "IP-адрес вашего роутера (обычно 192.168.1.1).",
  ssh_port: "Порт для SSH подключения (обычно 22 или 222).",
  ssh_user: "Логин пользователя Entware (обычно root).",
  ssh_pass: "Пароль пользователя root.",
  remotePath: "Путь к папке с конфигами Xray на роутере.",
  tag: "Уникальное имя (метка) для этого соединения. Используется в правилах маршрутизации.",
  protocol: "Протокол передачи данных. VLESS — современный и быстрый, HTTP — классический прокси.",
  vnext: "Настройки адреса и порта удаленного сервера.",
  uuid: "Уникальный идентификатор пользователя (ID). Должен совпадать с тем, что настроен на сервере.",
  reality: "Reality — маскировка прокси под реальный сайт. Делает трафик неотличимым от обычного HTTPS.",
  http_addr: "Адрес и порт вашего HTTP-прокси сервера.",
  http_auth: "Данные для входа (логин и пароль), если прокси требует авторизацию.",
  outboundTag: "Куда отправить трафик: на прокси, напрямую (direct) или заблокировать (block).",
  domain_rule: "Список доменов. Можно использовать Geosite (например, ext:geosite.dat:google).",
  ip_rule: "Список IP-адресов или CIDR-диапазонов (например, 1.1.1.1/32), или GeoIP теги.",
  rule_network: "Тип сетевого протокола для этого правила. Обычно tcp, udp или оба.",
  rule_port: "Список портов. Можно через запятую или диапазон (например: 80, 443, 1000-2000).",
  block_response: "Тип ответа при блокировке. HTTP — браузер сразу покажет ошибку 403. None — соединение просто сбросится."
};

// --- Components ---

const Tooltip = ({ targetRect, text }: { targetRect: DOMRect, text: string }) => {
  if (typeof window === 'undefined') return null;
  const width = 250;
  const padding = 12;
  let top = targetRect.top - padding - 10;
  let left = targetRect.left + (targetRect.width / 2) - (width / 2);
  if (top < 100) top = targetRect.bottom + 10;
  if (left < 10) left = 10;
  if (left + width > window.innerWidth - 10) left = window.innerWidth - width - 10;
  return createPortal(<div className="fixed z-[9999] pointer-events-none" style={{ top, left, width }}><div className="bg-blue-600 text-white text-[11px] p-3 rounded-xl shadow-2xl border border-blue-400/30 leading-relaxed animate-in fade-in zoom-in-95 origin-bottom">{text}</div></div>, document.body);
};

const LabelWithInfo = ({ label, infoKey }: { label: string, infoKey: string }) => {
  const [show, setShow] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const handleEnter = () => { if (iconRef.current) { setRect(iconRef.current.getBoundingClientRect()); setShow(true); } };
  return (<div className="flex items-center gap-2 mb-1.5"><label className="block text-xs uppercase text-gray-500 font-bold">{label}</label><div ref={iconRef} onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)} className="text-gray-600 hover:text-blue-400 transition cursor-help"><Info size={14} /></div>{show && rect && <Tooltip targetRect={rect} text={HELP_DATA[infoKey] || "Нет описания."} />}</div>);
};

const Modal = ({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-[#1e293b] w-full max-w-2xl max-h-[90vh] rounded-3xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
      <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-[#0f172a]"><h3 className="text-xl font-bold text-white">{title}</h3><button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition"><X size={20} /></button></div>
      <div className="p-6 overflow-y-auto custom-scrollbar">{children}</div>
    </div>
  </div>
);

const Badge = ({ children, color = 'blue' }: { children: React.ReactNode, color?: string }) => {
  const colors: any = { blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20', green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', red: 'bg-red-500/10 text-red-400 border-red-500/20', orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20', gray: 'bg-gray-700 text-gray-300 border-gray-600' };
  return <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${colors[color] || colors.gray}`}>{children}</span>;
};

const DiffViewer = ({ original, current, title }: { original: any, current: any, title: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const originalStr = JSON.stringify(original, null, 2);
  const currentStr = JSON.stringify(current, null, 2);
  const diff = Diff.diffLines(originalStr, currentStr);
  if (!original) return null;
  return (
    <div className="mt-12 bg-[#0f172a] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition">
        <div className="flex items-center gap-4 text-gray-400"><FileCode size={24} className="text-blue-500" /><span className="font-bold text-lg">{title} Live Changes</span><Badge color={diff.length > 1 ? 'orange' : 'gray'}>{diff.length > 1 ? 'Unsaved Changes' : 'No Changes'}</Badge></div>
        {isOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
      </button>
      {isOpen && <div className="p-6 pt-0"><div className="bg-[#1e293b] p-6 rounded-2xl font-mono text-sm overflow-x-auto border border-gray-700">{diff.map((part, index) => <div key={index} className={`whitespace-pre-wrap ${part.added ? 'bg-emerald-500/20 text-emerald-400 px-1 rounded' : part.removed ? 'bg-red-500/20 text-red-400 px-1 rounded line-through opacity-70' : 'text-gray-500 opacity-40'}`}>{part.value}</div>)}</div></div>}
    </div>
  );
};

// --- Main App ---

export default function XKeenUI() {
  const [activeTab, setActiveTab] = useState('ssh');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [isFetched, setIsFetched] = useState(false);
  
  const [sshSettings, setSshSettings] = useState({ host: '192.168.1.1', username: 'root', port: 22, password: '', remotePath: '/opt/etc/xray/configs' });
  const [outbounds, setOutbounds] = useState<any[]>([]);
  const [routing, setRouting] = useState<any>({ rules: [] });
  const [originalOutbounds, setOriginalOutbounds] = useState<any>(null);
  const [originalRouting, setOriginalRouting] = useState<any>(null);

  const [editingServer, setEditingServer] = useState<{ idx: number, data: any } | null>(null);
  const [editingRule, setEditingRule] = useState<{ idx: number, data: any } | null>(null);
  const [pushLogs, setPushLogs] = useState<{ msg: string, type: string }[] | null>(null);
  const [search, setSearch] = useState({ query: '', results: [] as string[], type: 'geosite' as 'geosite' | 'geoip' });

  useEffect(() => { axios.get('/api/settings').then(res => setSshSettings(res.data)).catch(console.error); }, []);
  const showStatus = (msg: string, isError = false) => { setStatus((isError ? 'Error: ' : '') + msg); if (!isError) setTimeout(() => setStatus(''), 3000); };

  const fetchFiles = async () => {
    setLoading(true); showStatus('Connecting to Keenetic...'); setIsSidebarOpen(false);
    try {
      const res = await axios.get('/api/fetch');
      setOutbounds(res.data.outbounds.outbounds); setRouting(res.data.routing.routing);
      setOriginalOutbounds(res.data.outbounds); setOriginalRouting(res.data.routing);
      setIsFetched(true); showStatus('Config fetched successfully');
    } catch (err: any) { showStatus(err.response?.data?.error || err.message, true); }
    setLoading(false);
  };

  const pushFiles = async () => {
    setLoading(true); setPushLogs([]); setIsSidebarOpen(false);
    try {
      const response = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outbounds: { outbounds }, routing: { routing } }) });
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(Boolean);
          lines.forEach(line => { try { const log = JSON.parse(line); setPushLogs(prev => [...(prev || []), log]); } catch (e) { console.error('Parse error', e); } });
        }
      }
      setOriginalOutbounds({ outbounds }); setOriginalRouting({ routing });
    } catch (err: any) { setPushLogs(prev => [...(prev || []), { msg: `FATAL ERROR: ${err.message}`, type: 'error' }]); }
    setLoading(false);
  };

  const handleServerSave = () => {
    if (!editingServer) return;
    const n = [...outbounds]; if (editingServer.idx === -1) n.push(editingServer.data); else n[editingServer.idx] = editingServer.data;
    setOutbounds(n); setEditingServer(null);
  };

  const handleRuleSave = () => {
    if (!editingRule) return;
    const n = [...routing.rules]; if (editingRule.idx === -1) n.push(editingRule.data); else n[editingRule.idx] = editingRule.data;
    setRouting({ ...routing, rules: n }); setEditingRule(null);
  };

  const performSearch = async (q: string, type: 'geosite' | 'geoip') => {
    setSearch(prev => ({ ...prev, query: q, type }));
    if (q.length < 2) return setSearch(prev => ({ ...prev, results: [] }));
    try { const res = await axios.get(`/api/geosite/search?q=${q}&type=${type}`); setSearch(prev => ({ ...prev, results: res.data })); } catch (e) { console.error(e); }
  };

  const renderServerTileInfo = (node: any) => {
    if (node.protocol === 'vless' && node.settings?.vnext) {
      return (<div className="space-y-2"><p className="text-sm text-gray-400 font-mono">{node.settings.vnext[0].address}:{node.settings.vnext[0].port}</p>{node.streamSettings?.realitySettings && (<div className="text-[11px] bg-[#0f172a] p-3 rounded-xl border border-gray-800 space-y-1 text-gray-500 font-mono"><p className="truncate"><span className="text-blue-500 uppercase tracking-tighter mr-1">SNI:</span> {node.streamSettings.realitySettings.serverName}</p><p className="truncate"><span className="text-blue-500 uppercase tracking-tighter mr-1">FP:</span> {node.streamSettings.realitySettings.fingerprint}</p></div>)}</div>);
    }
    if (node.protocol === 'http' && node.settings?.servers) {
      const srv = node.settings.servers[0];
      return (<div className="space-y-2"><p className="text-sm text-gray-400 font-mono">{srv.address}:{srv.port}</p><div className="text-[11px] bg-[#0f172a] p-3 rounded-xl border border-gray-800 space-y-1 text-gray-500 font-mono"><p className="truncate"><span className="text-emerald-500 uppercase tracking-tighter mr-1">User:</span> {srv.users?.[0]?.user || "none"}</p></div></div>);
    }
    if (node.protocol === 'blackhole' && node.settings?.response) {
      return (<div className="space-y-2"><div className="text-[11px] bg-[#0f172a] p-3 rounded-xl border border-gray-800 space-y-1 text-gray-500 font-mono"><p className="truncate"><span className="text-red-500 uppercase tracking-tighter mr-1">Response:</span> {node.settings.response.type.toUpperCase()}</p></div></div>);
    }
    return <p className="text-sm text-gray-500 italic">No extra info</p>;
  };

  return (
    <div className="flex h-screen bg-[#0f172a] text-gray-100 font-sans overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 w-full h-16 bg-[#1e293b] border-b border-gray-800 flex items-center justify-between px-4 z-50">
        <h1 className="text-lg font-bold text-blue-400">XKeen Config</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:text-white transition">
          {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity animate-in fade-in" onClick={() => setIsSidebarOpen(false)} />}

      {/* Sidebar */}
      <div className={`fixed lg:relative inset-y-0 left-0 w-[280px] bg-[#1e293b] border-r border-gray-800 p-6 flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <h1 className="hidden lg:flex text-2xl font-black mb-10 items-center gap-3 text-blue-500 tracking-tight"><RefreshCw className="animate-spin-slow" /> XKeen UI</h1>
        <div className="space-y-2 flex-1 mt-12 lg:mt-0">
          {[
            { id: 'ssh', icon: Settings, label: 'SSH Connect' },
            { id: 'outbounds', icon: Server, label: 'Proxy Servers' },
            { id: 'routing', icon: Shuffle, label: 'Routing Rules' },
            { id: 'backups', icon: History, label: 'History' }
          ].map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} className={`w-full text-left p-4 rounded-xl flex items-center gap-4 transition-all duration-200 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg scale-[1.02]' : 'hover:bg-gray-700/50 text-gray-400'}`}>
              <item.icon size={22} /> <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-auto space-y-3 pt-6 border-t border-gray-800">
          <button onClick={fetchFiles} disabled={loading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold disabled:opacity-50 text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-emerald-900/20"><CloudDownload size={20} /> Fetch Data</button>
          <button onClick={pushFiles} disabled={loading || !isFetched} className="w-full py-4 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold disabled:opacity-50 text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-orange-900/20"><CloudUpload size={20} /> Push & Restart</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto relative pt-16 lg:pt-0">
        <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-12">
          {status && (<div className={`fixed top-20 lg:top-4 right-4 z-[60] p-4 rounded-xl border shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 flex items-center gap-3 font-medium ${status.startsWith('Error') ? 'bg-red-500/10 border-red-500/50 text-red-300' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'}`}>{loading ? <RefreshCw size={20} className="animate-spin" /> : status.startsWith('Error') ? <AlertCircle size={20} /> : <Check size={20} />} {status}</div>)}

          {activeTab === 'ssh' && (
            <div className="bg-[#1e293b] rounded-3xl p-6 md:p-10 border border-gray-800 shadow-xl">
              <h2 className="text-3xl font-black text-white mb-2">Keenetic Access</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="space-y-4">
                  <div className="flex gap-4"><div className="flex-1"><LabelWithInfo label="Host IP" infoKey="ssh_host" /><input type="text" value={sshSettings.host} onChange={e => setSshSettings({...sshSettings, host: e.target.value})} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500" /></div><div className="w-24"><LabelWithInfo label="Port" infoKey="ssh_port" /><input type="number" value={sshSettings.port} onChange={e => setSshSettings({...sshSettings, port: parseInt(e.target.value)})} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500" /></div></div>
                  <LabelWithInfo label="Username" infoKey="ssh_user" /><input type="text" value={sshSettings.username} onChange={e => setSshSettings({...sshSettings, username: e.target.value})} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-4">
                  <LabelWithInfo label="Password" infoKey="ssh_pass" /><input type="password" value={sshSettings.password} onChange={e => setSshSettings({...sshSettings, password: e.target.value})} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
                  <LabelWithInfo label="Remote Path" infoKey="remotePath" /><input type="text" value={sshSettings.remotePath} onChange={e => setSshSettings({...sshSettings, remotePath: e.target.value})} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
                </div>
                <button onClick={async () => { setLoading(true); try { await axios.post('/api/settings', sshSettings); showStatus('SSH settings saved locally'); } catch (err: any) { showStatus(err.message, true); } setLoading(false); }} className="md:col-span-2 mt-4 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-xl transition-all active:scale-95">Save Settings</button>
              </div>
            </div>
          )}

          {activeTab === 'outbounds' && (
            <div className="space-y-6 pb-20">
              <div className="flex justify-between items-end mb-8"><h2 className="text-3xl font-black text-white mb-1">Proxies</h2><button onClick={() => setEditingServer({ idx: -1, data: { tag: 'new-server', protocol: 'vless', settings: {} } })} className="p-4 bg-blue-600 hover:bg-blue-500 rounded-2xl shadow-lg active:scale-95 transition-all"><Plus size={24} /></button></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {outbounds.map((node, i) => (
                  <div key={i} className="bg-[#1e293b] border border-gray-800 p-6 rounded-3xl group hover:border-blue-500/50 transition-all shadow-xl relative">
                    <div className="flex justify-between items-start mb-4"><Badge color={node.protocol === 'vless' ? 'blue' : node.protocol === 'http' ? 'green' : node.protocol === 'blackhole' ? 'red' : 'gray'}>{node.protocol}</Badge><div className="flex gap-1"><button onClick={() => setEditingServer({ idx: i, data: JSON.parse(JSON.stringify(node)) })} className="p-2 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition"><Edit size={16} /></button><button onClick={() => { const n = [...outbounds]; n.splice(i, 1); setOutbounds(n); }} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition"><Trash size={16} /></button></div></div>
                    <h3 className="text-lg font-bold mb-2 truncate">{node.tag}</h3>{renderServerTileInfo(node)}
                  </div>
                ))}
              </div>
              <DiffViewer original={originalOutbounds} current={{ outbounds }} title="Outbounds JSON" />
            </div>
          )}

          {activeTab === 'routing' && (
            <div className="space-y-8 pb-20">
              <div className="flex justify-between items-end mb-8"><h2 className="text-3xl font-black text-white mb-1">Routing</h2><button onClick={() => setEditingRule({ idx: -1, data: { type: 'field', outboundTag: 'vless-reality', domain: [], ip: [], inboundTag: ['redirect', 'tproxy'] } })} className="p-4 bg-blue-600 hover:bg-blue-500 rounded-2xl shadow-lg active:scale-95 transition-all"><Plus size={24} /></button></div>
              <div className="space-y-4">
                {routing.rules.map((rule: any, i: number) => (
                  <div key={i} className="bg-[#1e293b] border border-gray-800 rounded-3xl overflow-hidden hover:border-gray-700 transition">
                    <div className="p-6 flex justify-between items-center bg-gray-800/20 border-b border-gray-800"><div className="flex items-center gap-3"><Badge color={rule.outboundTag === 'block' ? 'red' : rule.outboundTag === 'direct' ? 'green' : 'blue'}>{rule.outboundTag.toUpperCase()}</Badge>{rule.network && <Badge color="orange">{rule.network}</Badge>}{rule.port && <Badge color="orange">Port: {rule.port}</Badge>}</div><div className="flex gap-2"><button onClick={() => setEditingRule({ idx: i, data: JSON.parse(JSON.stringify(rule)) })} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-bold flex items-center gap-2 transition"><Edit size={14} /> Edit</button><button onClick={() => { const n = [...routing.rules]; n.splice(i, 1); setRouting({ ...routing, rules: n }); }} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition"><Trash size={18} /></button></div></div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div><h4 className="text-xs font-bold text-gray-500 uppercase mb-3"><Globe size={14} className="inline mr-2"/> Domains ({rule.domain?.length || 0})</h4><div className="flex flex-wrap gap-2">{rule.domain?.slice(0, 10).map((d: any, idx: any) => <span key={idx} className="text-xs bg-[#0f172a] border border-gray-700 px-2 py-1 rounded text-gray-300 break-all">{d}</span>)}</div></div>
                       <div><h4 className="text-xs font-bold text-gray-500 uppercase mb-3"><Shield size={14} className="inline mr-2"/> IPs ({rule.ip?.length || 0})</h4><div className="flex flex-wrap gap-2">{rule.ip?.slice(0, 10).map((ip: any, idx: any) => <span key={idx} className="text-xs bg-[#0f172a] border border-gray-700 px-2 py-1 rounded text-gray-300 break-all">{ip}</span>)}</div></div>
                    </div>
                  </div>
                ))}
              </div>
              <DiffViewer original={originalRouting} current={{ routing }} title="Routing JSON" />
            </div>
          )}
        </div>
      </div>

      {/* --- Modals --- */}
      
      {pushLogs && (
        <Modal title="Deploying to Keenetic" onClose={() => setPushLogs(null)}>
          <div className="bg-[#0f172a] rounded-2xl p-6 font-mono text-sm border border-gray-800 shadow-inner h-80 overflow-y-auto custom-scrollbar flex flex-col gap-2">
            <div className="flex items-center gap-2 text-blue-500 mb-2 border-b border-gray-800 pb-2"><Terminal size={18} /><span className="font-bold">xkeen_deployment.log</span></div>
            {pushLogs.map((log, i) => (<div key={i} className={`flex gap-3 animate-in fade-in slide-in-from-left-2 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : 'text-gray-400'}`}><span className="opacity-30">[{new Date().toLocaleTimeString()}]</span>{log.type === 'success' ? <Check size={14} className="mt-1 flex-shrink-0" /> : log.type === 'error' ? <AlertCircle size={14} className="mt-1 flex-shrink-0" /> : <ArrowRight size={14} className="mt-1 flex-shrink-0" />}<span className="leading-relaxed">{log.msg}</span></div>))}
            {loading && <div className="flex gap-3 text-blue-400 animate-pulse"><span className="opacity-30">[{new Date().toLocaleTimeString()}]</span> <RefreshCw size={14} className="animate-spin mt-1" /> Ожидание...</div>}
          </div>
          {!loading && <button onClick={() => setPushLogs(null)} className="w-full mt-6 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold transition-all">Закрыть</button>}
        </Modal>
      )}

      {editingServer && (
        <Modal title={editingServer.idx === -1 ? 'Add New Server' : 'Edit Server'} onClose={() => setEditingServer(null)}>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div><LabelWithInfo label="Tag (Name)" infoKey="tag" /><input type="text" className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-2 outline-none focus:border-blue-500" value={editingServer.data.tag} onChange={e => setEditingServer({...editingServer, data: {...editingServer.data, tag: e.target.value}})} /></div>
              <div><LabelWithInfo label="Protocol" infoKey="protocol" /><select className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-2 outline-none focus:border-blue-500" value={editingServer.data.protocol} onChange={e => setEditingServer({...editingServer, data: {...editingServer.data, protocol: e.target.value, settings: {}}})}><option value="vless">VLESS</option><option value="http">HTTP Proxy</option><option value="freedom">Freedom (Direct)</option><option value="blackhole">Blackhole (Block)</option></select></div>
            </div>
            {editingServer.data.protocol === 'vless' && (
              <div className="space-y-4">
                 <div className="p-4 bg-[#0f172a] rounded-xl border border-gray-700 space-y-4"><LabelWithInfo label="Connection Details" infoKey="vnext" /><div className="grid grid-cols-3 gap-4"><input placeholder="Address" type="text" className="col-span-2 w-full bg-[#1e293b] border border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-blue-500" value={editingServer.data.settings?.vnext?.[0]?.address || ''} onChange={e => { const newData = {...editingServer.data}; if(!newData.settings.vnext) newData.settings.vnext = [{ address: '', port: 443, users: [{ id: '', flow: 'xtls-rprx-vision' }] }]; newData.settings.vnext[0].address = e.target.value; setEditingServer({...editingServer, data: newData}); }} /><input placeholder="Port" type="number" className="w-full bg-[#1e293b] border border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-blue-500" value={editingServer.data.settings?.vnext?.[0]?.port || ''} onChange={e => { const newData = {...editingServer.data}; if(newData.settings.vnext) newData.settings.vnext[0].port = parseInt(e.target.value); setEditingServer({...editingServer, data: newData}); }} /></div><LabelWithInfo label="UUID" infoKey="uuid" /><input type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded-lg px-3 py-2 font-mono text-sm outline-none focus:border-blue-500" value={editingServer.data.settings?.vnext?.[0]?.users?.[0]?.id || ''} onChange={e => { const newData = {...editingServer.data}; if(newData.settings.vnext) newData.settings.vnext[0].users[0].id = e.target.value; setEditingServer({...editingServer, data: newData}); }} /></div>
                 <div className="p-4 bg-[#0f172a] rounded-xl border border-gray-700 space-y-4"><LabelWithInfo label="Reality / TLS" infoKey="reality" /><input placeholder="Public Key" type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded-lg px-3 py-2 font-mono text-xs outline-none focus:border-blue-500" value={editingServer.data.streamSettings?.realitySettings?.publicKey || ''} onChange={e => { const newData = {...editingServer.data}; if(!newData.streamSettings) newData.streamSettings = { network: 'tcp', security: 'reality' }; if(!newData.streamSettings.realitySettings) newData.streamSettings.realitySettings = { publicKey: '', fingerprint: 'chrome', serverName: '', shortId: '' }; newData.streamSettings.realitySettings.publicKey = e.target.value; setEditingServer({...editingServer, data: newData}); }} /><div className="grid grid-cols-2 gap-4"><input placeholder="SNI" type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-blue-500" value={editingServer.data.streamSettings?.realitySettings?.serverName || ''} onChange={e => { const newData = {...editingServer.data}; if(newData.streamSettings?.realitySettings) newData.streamSettings.realitySettings.serverName = e.target.value; setEditingServer({...editingServer, data: newData}); }} /><input placeholder="Short ID" type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-blue-500" value={editingServer.data.streamSettings?.realitySettings?.shortId || ''} onChange={e => { const newData = {...editingServer.data}; if(newData.streamSettings?.realitySettings) newData.streamSettings.realitySettings.shortId = e.target.value; setEditingServer({...editingServer, data: newData}); }} /></div></div>
              </div>
            )}
            {editingServer.data.protocol === 'http' && (
              <div className="space-y-4">
                 <div className="p-4 bg-[#0f172a] rounded-xl border border-gray-700 space-y-4"><LabelWithInfo label="Server Address" infoKey="http_addr" /><div className="grid grid-cols-3 gap-4"><input placeholder="Address" type="text" className="col-span-2 w-full bg-[#1e293b] border border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-blue-500" value={editingServer.data.settings?.servers?.[0]?.address || ''} onChange={e => { const newData = {...editingServer.data}; if(!newData.settings.servers) newData.settings.servers = [{ address: '', port: 8080, users: [{ user: '', pass: '' }] }]; newData.settings.servers[0].address = e.target.value; setEditingServer({...editingServer, data: newData}); }} /><input placeholder="Port" type="number" className="w-full bg-[#1e293b] border border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-blue-500" value={editingServer.data.settings?.servers?.[0]?.port || ''} onChange={e => { const newData = {...editingServer.data}; if(newData.settings.servers) newData.settings.servers[0].port = parseInt(e.target.value); setEditingServer({...editingServer, data: newData}); }} /></div></div>
                 <div className="p-4 bg-[#0f172a] rounded-xl border border-gray-700 space-y-4"><LabelWithInfo label="Authentication" infoKey="http_auth" /><div className="grid grid-cols-2 gap-4"><input placeholder="Username" type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-blue-500" value={editingServer.data.settings?.servers?.[0]?.users?.[0]?.user || ''} onChange={e => { const newData = {...editingServer.data}; if(newData.settings.servers) newData.settings.servers[0].users[0].user = e.target.value; setEditingServer({...editingServer, data: newData}); }} /><input placeholder="Password" type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-blue-500" value={editingServer.data.settings?.servers?.[0]?.users?.[0]?.pass || ''} onChange={e => { const newData = {...editingServer.data}; if(newData.settings.servers) newData.settings.servers[0].users[0].pass = e.target.value; setEditingServer({...editingServer, data: newData}); }} /></div></div>
              </div>
            )}
            {editingServer.data.protocol === 'blackhole' && (
              <div className="space-y-4">
                 <div className="p-4 bg-[#0f172a] rounded-xl border border-gray-700 space-y-4"><LabelWithInfo label="Response Settings" infoKey="block_response" /><select className="w-full bg-[#1e293b] border border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-blue-500" value={editingServer.data.settings?.response?.type || 'none'} onChange={e => { const newData = {...editingServer.data}; if(!newData.settings) newData.settings = {}; newData.settings.response = { type: e.target.value }; setEditingServer({...editingServer, data: newData}); }}><option value="none">None (Just Drop)</option><option value="http">HTTP (Show 403 error)</option></select></div>
              </div>
            )}
            <button onClick={handleServerSave} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-lg transition-all active:scale-95">Save Server</button>
          </div>
        </Modal>
      )}

      {editingRule && (
        <Modal title={editingRule.idx === -1 ? 'Add Routing Rule' : 'Edit Rule'} onClose={() => setEditingRule(null)}>
           <div className="space-y-6">
              <div className="p-4 bg-[#0f172a] rounded-xl border border-gray-700"><LabelWithInfo label="Traffic Action (Outbound)" infoKey="outboundTag" /><div className="flex flex-wrap gap-2">{['direct', 'block', ...outbounds.filter((o:any) => o.protocol !== 'freedom' && o.protocol !== 'blackhole').map((o:any) => o.tag)].map(tag => (<button key={tag} onClick={() => setEditingRule({...editingRule, data: {...editingRule.data, outboundTag: tag}})} className={`px-3 py-2 rounded-lg border text-xs font-bold transition ${editingRule.data.outboundTag === tag ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}>{tag.toUpperCase()}</button>))}</div></div>
              <div className="grid grid-cols-2 gap-4"><div><LabelWithInfo label="Network" infoKey="rule_network" /><select className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-2 outline-none focus:border-blue-500" value={editingRule.data.network || ''} onChange={e => setEditingRule({...editingRule, data: {...editingRule.data, network: e.target.value || undefined}})}><option value="">Any</option><option value="tcp">TCP</option><option value="udp">UDP</option><option value="tcp,udp">TCP + UDP</option></select></div><div><LabelWithInfo label="Port(s)" infoKey="rule_port" /><input type="text" className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-2 outline-none focus:border-blue-500" placeholder="e.g. 80, 443" value={editingRule.data.port || ''} onChange={e => setEditingRule({...editingRule, data: {...editingRule.data, port: e.target.value}})} /></div></div>
              <div><LabelWithInfo label="Domains & Geosites" infoKey="domain_rule" /><div className="flex gap-2 mb-2"><input className="flex-1 bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-2 outline-none focus:border-blue-500" placeholder="Search Geosite (v2fly)..." value={search.type === 'geosite' ? search.query : ''} onChange={e => performSearch(e.target.value, 'geosite')} /><button onClick={() => { if(!search.query) return; const newData = {...editingRule.data}; if(!newData.domain) newData.domain = []; newData.domain.push(search.query); setEditingRule({...editingRule, data: newData}); setSearch({...search, query: ''}); }} className="px-4 bg-blue-600 rounded-xl font-bold"><Plus size={20}/></button></div>{search.type === 'geosite' && search.results.length > 0 && (<div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-h-40 overflow-auto mb-2">{search.results.map(res => <button key={res} className="w-full text-left p-3 hover:bg-blue-600 border-b border-gray-700 text-sm font-bold flex justify-between items-center" onClick={() => { const newData = {...editingRule.data}; if(!newData.domain) newData.domain = []; newData.domain.push(`ext:geosite_v2fly.dat:${res}`); setEditingRule({...editingRule, data: newData}); setSearch({ ...search, results: [], query: '' }); }}>{res} <Badge color="blue">v2fly</Badge></button>)}</div>)}<div className="bg-[#0f172a] rounded-xl border border-gray-700 p-2 max-h-40 overflow-y-auto flex flex-wrap gap-2">{editingRule.data.domain?.map((d:any, i:any) => <div key={i} className="bg-gray-800 px-2 py-1 rounded text-[11px] flex items-center gap-2 border border-gray-600">{d} <button onClick={() => { const newData = {...editingRule.data}; newData.domain.splice(i, 1); setEditingRule({...editingRule, data: newData}); }}><X size={12}/></button></div>)}</div></div>
              <div><LabelWithInfo label="IP Addresses & GeoIP" infoKey="ip_rule" /><div className="flex gap-2 mb-2"><input className="flex-1 bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-2 outline-none focus:border-blue-500" placeholder="Search GeoIP or type IP..." value={search.type === 'geoip' ? search.query : ''} onChange={e => performSearch(e.target.value, 'geoip')} /><button onClick={() => { if(!search.query) return; const newData = {...editingRule.data}; if(!newData.ip) newData.ip = []; newData.ip.push(search.query); setEditingRule({...editingRule, data: newData}); setSearch({...search, query: ''}); }} className="px-4 bg-emerald-600 rounded-xl font-bold"><Plus size={20}/></button></div>{search.type === 'geoip' && search.results.length > 0 && (<div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-h-40 overflow-auto mb-2">{search.results.map(res => <button key={res} className="w-full text-left p-3 hover:bg-emerald-600 border-b border-gray-700 text-sm font-bold flex justify-between items-center" onClick={() => { const newData = {...editingRule.data}; if(!newData.ip) newData.ip = []; newData.ip.push(`ext:geoip_v2fly.dat:${res}`); setEditingRule({...editingRule, data: newData}); setSearch({ ...search, results: [], query: '' }); }}>{res} <Badge color="green">v2fly</Badge></button>)}</div>)}<div className="bg-[#0f172a] rounded-xl border border-gray-700 p-2 max-h-40 overflow-y-auto flex flex-wrap gap-2">{editingRule.data.ip?.map((ip:any, i:any) => <div key={i} className="bg-gray-800 px-2 py-1 rounded text-[11px] flex items-center gap-2 border border-gray-600">{ip} <button onClick={() => { const newData = {...editingRule.data}; newData.ip.splice(i, 1); setEditingRule({...editingRule, data: newData}); }}><X size={12}/></button></div>)}</div></div>
              <button onClick={handleRuleSave} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-lg transition-all active:scale-95">Save Rule</button>
           </div>
        </Modal>
      )}
    </div>
  );
}
