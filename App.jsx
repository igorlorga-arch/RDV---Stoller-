import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Fuel, Bed, CalendarDays, UtensilsCrossed, MoreHorizontal, Plus, Trash2,
  TrendingUp, Wallet, PieChart as PieIcon, StickyNote, LayoutDashboard, Pencil,
  Camera, X, Image as ImageIcon, Paperclip,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const CATEGORIES = [
  { id: 'combustivel', label: 'Combustível', icon: Fuel, color: '#C97A3D' },
  { id: 'hospedagem', label: 'Hospedagem', icon: Bed, color: '#4C7A6E' },
  { id: 'eventos', label: 'Eventos', icon: CalendarDays, color: '#6B5B95' },
  { id: 'alimentacao', label: 'Alimentação', icon: UtensilsCrossed, color: '#B5533C' },
  { id: 'outros', label: 'Outros', icon: MoreHorizontal, color: '#7A7268' },
];

const currency = (v) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const todayStr = () => new Date().toISOString().slice(0, 10);
const monthKey = (dateStr) => dateStr.slice(0, 7); // YYYY-MM
const currentMonthKey = () => todayStr().slice(0, 7);

const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  const s = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Redimensiona e comprime a foto antes de salvar, pra não estourar o limite de armazenamento
const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1000;
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = () => reject(new Error('Não foi possível ler a imagem'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo'));
    reader.readAsDataURL(file);
  });

export default function DespesasViagem() {
  const [entries, setEntries] = useState([]);
  const [budget, setBudget] = useState(0);
  const [notes, setNotes] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [tab, setTab] = useState('resumo');
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState(null);

  const [form, setForm] = useState({
    categoria: 'combustivel',
    valor: '',
    descricao: '',
    data: todayStr(),
    foto: null,
  });

  // load
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get('entries', false);
        if (res && res.value) setEntries(JSON.parse(res.value));
      } catch (e) { /* first run, no data yet */ }
      try {
        const res = await window.storage.get('budget', false);
        if (res && res.value) setBudget(parseFloat(res.value) || 0);
      } catch (e) { /* first run, no data yet */ }
      try {
        const res = await window.storage.get('notes', false);
        if (res && res.value) setNotes(res.value);
      } catch (e) { /* first run, no data yet */ }
      setLoaded(true);
    })();
  }, []);

  const persistEntries = useCallback(async (next) => {
    setSaving(true);
    try {
      const result = await window.storage.set('entries', JSON.stringify(next), false);
      setErrorMsg(result ? '' : 'Não consegui salvar. Tente novamente.');
    } catch (e) {
      setErrorMsg('Não consegui salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }, []);

  const persistBudget = useCallback(async (value) => {
    setSaving(true);
    try {
      const result = await window.storage.set('budget', String(value), false);
      setErrorMsg(result ? '' : 'Não consegui salvar o orçamento.');
    } catch (e) {
      setErrorMsg('Não consegui salvar o orçamento.');
    } finally {
      setSaving(false);
    }
  }, []);

  const persistNotes = useCallback(async (value) => {
    setSaving(true);
    try {
      const result = await window.storage.set('notes', value, false);
      setErrorMsg(result ? '' : 'Não consegui salvar as notas.');
    } catch (e) {
      setErrorMsg('Não consegui salvar as notas.');
    } finally {
      setSaving(false);
    }
  }, []);

  const addEntry = async () => {
    const valorNum = parseFloat(form.valor.replace(',', '.'));
    if (!valorNum || valorNum <= 0) {
      setErrorMsg('Informe um valor válido.');
      return;
    }
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const newEntry = {
      id,
      categoria: form.categoria,
      valor: valorNum,
      descricao: form.descricao.trim(),
      data: form.data,
      hasFoto: !!form.foto,
    };
    const next = [newEntry, ...entries];
    setEntries(next);
    persistEntries(next);
    if (form.foto) {
      try {
        const result = await window.storage.set(`receipt:${id}`, form.foto, false);
        if (!result) setErrorMsg('Gasto salvo, mas a foto não pôde ser anexada.');
      } catch (e) {
        setErrorMsg('Gasto salvo, mas a foto não pôde ser anexada.');
      }
    }
    setForm({ ...form, valor: '', descricao: '', foto: null });
  };

  const removeEntry = async (id, hasFoto) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    persistEntries(next);
    if (hasFoto) {
      try {
        await window.storage.delete(`receipt:${id}`, false);
      } catch (e) { /* já não existe, tudo bem */ }
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError('');
    setProcessingPhoto(true);
    try {
      const dataUrl = await compressImage(file);
      setForm((f) => ({ ...f, foto: dataUrl }));
    } catch (err) {
      setPhotoError('Não consegui processar essa foto. Tente outra.');
    } finally {
      setProcessingPhoto(false);
    }
  };

  const openReceipt = async (id) => {
    setLoadingReceiptId(id);
    try {
      const res = await window.storage.get(`receipt:${id}`, false);
      if (res && res.value) setViewingReceipt(res.value);
      else setErrorMsg('Não encontrei a foto dessa nota.');
    } catch (e) {
      setErrorMsg('Não encontrei a foto dessa nota.');
    } finally {
      setLoadingReceiptId(null);
    }
  };

  const saveBudget = () => {
    const val = parseFloat(budgetDraft.replace(',', '.'));
    if (isNaN(val) || val < 0) {
      setErrorMsg('Informe um orçamento válido.');
      return;
    }
    setBudget(val);
    persistBudget(val);
    setEditingBudget(false);
  };

  const thisMonth = currentMonthKey();
  const monthEntries = useMemo(
    () => entries.filter((e) => monthKey(e.data) === thisMonth),
    [entries, thisMonth]
  );

  const total = entries.reduce((s, e) => s + e.valor, 0);
  const totalMonth = monthEntries.reduce((s, e) => s + e.valor, 0);
  const remaining = budget - totalMonth;
  const usedPct = budget > 0 ? Math.min(100, (totalMonth / budget) * 100) : 0;
  const overBudget = budget > 0 && totalMonth > budget;

  const totalsByCategory = CATEGORIES.map((c) => ({
    ...c,
    total: entries.filter((e) => e.categoria === c.id).reduce((s, e) => s + e.valor, 0),
    count: entries.filter((e) => e.categoria === c.id).length,
  }));
  const maxCatTotal = Math.max(1, ...totalsByCategory.map((c) => c.total));

  const pieData = totalsByCategory
    .filter((c) => c.total > 0)
    .map((c) => ({ name: c.label, value: c.total, color: c.color }));

  const monthlyTotals = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      const k = monthKey(e.data);
      map[k] = (map[k] || 0) + e.valor;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([k, v]) => ({ month: monthLabel(k).slice(0, 3), total: v }));
  }, [entries]);

  if (!loaded) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingText}>Carregando...</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        * { box-sizing: border-box; }
        input, select, textarea { font-family: 'Inter', sans-serif; }
        input:focus, select:focus, textarea:focus { outline: 2px solid #C97A3D; outline-offset: 2px; }
        button:focus-visible { outline: 2px solid #C97A3D; outline-offset: 2px; }
        ::placeholder { color: #A39B8F; }
        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; animation: none !important; }
        }
      `}</style>

      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.routeLine}>
            <div style={styles.routeDot} />
            <div style={styles.routeTrack} />
            <div style={styles.routeDot} />
          </div>
          <h1 style={styles.title}>RDV Stoller</h1>
          <p style={styles.subtitle}>Registro de gastos por etapa de viagem</p>
        </header>

        {/* Tabs */}
        <div style={styles.tabBar}>
          {[
            { id: 'resumo', label: 'Resumo', icon: LayoutDashboard },
            { id: 'grafico', label: 'Gráfico', icon: PieIcon },
            { id: 'notas', label: 'Notas', icon: StickyNote },
          ].map((t) => {
            const TIcon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{ ...styles.tabButton, ...(active ? styles.tabButtonActive : {}) }}
              >
                <TIcon size={15} strokeWidth={2.3} />
                {t.label}
              </button>
            );
          })}
        </div>

        {errorMsg && <div style={styles.errorBanner}>{errorMsg}</div>}

        {tab === 'resumo' && (
          <>
            {/* Budget card */}
            <div style={styles.budgetCard}>
              <div style={styles.budgetTopRow}>
                <div style={styles.budgetLabelRow}>
                  <Wallet size={14} />
                  <span style={styles.budgetLabel}>Orçamento de {monthLabel(thisMonth)}</span>
                </div>
                {!editingBudget && (
                  <button
                    onClick={() => { setBudgetDraft(String(budget || '')); setEditingBudget(true); }}
                    style={styles.editBudgetButton}
                    aria-label="Editar orçamento"
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>

              {editingBudget ? (
                <div style={styles.budgetEditRow}>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Valor mensal (R$)"
                    value={budgetDraft}
                    onChange={(e) => setBudgetDraft(e.target.value)}
                    style={styles.budgetInput}
                    autoFocus
                  />
                  <button onClick={saveBudget} style={styles.budgetSaveButton}>Salvar</button>
                </div>
              ) : budget > 0 ? (
                <>
                  <div style={styles.budgetFigures}>
                    <span style={{ ...styles.remainingValue, color: overBudget ? '#B5533C' : '#F5F2ED' }}>
                      {currency(remaining)}
                    </span>
                    <span style={styles.remainingLabel}>
                      {overBudget ? 'acima do orçamento' : 'restante'}
                    </span>
                  </div>
                  <div style={styles.budgetBarTrack}>
                    <div
                      style={{
                        ...styles.budgetBarFill,
                        width: `${usedPct}%`,
                        background: overBudget ? '#B5533C' : '#C97A3D',
                      }}
                    />
                  </div>
                  <div style={styles.budgetMetaRow}>
                    <span>{currency(totalMonth)} gasto</span>
                    <span>de {currency(budget)}</span>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => { setBudgetDraft(''); setEditingBudget(true); }}
                  style={styles.setBudgetButton}
                >
                  Definir orçamento mensal
                </button>
              )}
            </div>

            {/* Total geral */}
            <div style={styles.totalCard}>
              <span style={styles.totalLabel}>Total acumulado (geral)</span>
              <span style={styles.totalValue}>{currency(total)}</span>
              <span style={styles.totalMeta}>
                {entries.length} {entries.length === 1 ? 'lançamento' : 'lançamentos'}
              </span>
            </div>

            {/* Form */}
            <div style={styles.formCard}>
              <div style={styles.formRow}>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  style={styles.select}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                  style={styles.dateInput}
                />
              </div>
              <div style={styles.formRow}>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Valor (R$)"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  style={styles.valorInput}
                />
                <input
                  type="text"
                  placeholder="Descrição (opcional)"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  style={styles.descInput}
                />
              </div>
              <div style={styles.photoRow}>
                <label style={styles.photoButton}>
                  <Camera size={16} strokeWidth={2.2} />
                  {processingPhoto ? 'Processando...' : form.foto ? 'Trocar foto' : 'Tirar foto da nota'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    style={styles.hiddenFileInput}
                  />
                </label>
                {form.foto && (
                  <div style={styles.photoPreviewWrap}>
                    <img src={form.foto} alt="Prévia da nota" style={styles.photoPreview} />
                    <button
                      onClick={() => setForm((f) => ({ ...f, foto: null }))}
                      style={styles.photoRemoveButton}
                      aria-label="Remover foto"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
              {photoError && <div style={styles.errorText}>{photoError}</div>}
              <button onClick={addEntry} style={styles.addButton}>
                <Plus size={18} strokeWidth={2.5} />
                Adicionar gasto
              </button>
            </div>

            {/* By category */}
            <div style={styles.sectionHeading}>
              <TrendingUp size={16} />
              <span>Por etapa</span>
            </div>
            <div style={styles.categoryGrid}>
              {totalsByCategory.map((c) => {
                const Icon = c.icon;
                const pct = (c.total / maxCatTotal) * 100;
                return (
                  <div key={c.id} style={styles.categoryCard}>
                    <div style={styles.categoryTop}>
                      <div style={{ ...styles.iconWrap, background: `${c.color}22`, color: c.color }}>
                        <Icon size={16} strokeWidth={2.2} />
                      </div>
                      <div style={styles.categoryInfo}>
                        <span style={styles.categoryLabel}>{c.label}</span>
                        <span style={styles.categoryValue}>{currency(c.total)}</span>
                      </div>
                    </div>
                    <div style={styles.barTrack}>
                      <div style={{ ...styles.barFill, width: `${pct}%`, background: c.color }} />
                    </div>
                    <span style={styles.categoryCount}>{c.count} lanç.</span>
                  </div>
                );
              })}
            </div>

            {/* History */}
            <div style={styles.sectionHeading}>
              <span>Histórico</span>
            </div>
            <div style={styles.historyList}>
              {entries.length === 0 && (
                <div style={styles.emptyState}>Nenhum gasto registrado ainda. Adicione o primeiro acima.</div>
              )}
              {entries.map((e) => {
                const cat = CATEGORIES.find((c) => c.id === e.categoria);
                const Icon = cat.icon;
                return (
                  <div key={e.id} style={styles.historyItem}>
                    <div style={{ ...styles.iconWrap, background: `${cat.color}22`, color: cat.color }}>
                      <Icon size={15} strokeWidth={2.2} />
                    </div>
                    <div style={styles.historyMid}>
                      <span style={styles.historyDesc}>{e.descricao || cat.label}</span>
                      <span style={styles.historyDate}>
                        {new Date(e.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <span style={styles.historyValue}>{currency(e.valor)}</span>
                    {e.hasFoto && (
                      <button
                        onClick={() => openReceipt(e.id)}
                        style={styles.receiptButton}
                        aria-label="Ver foto da nota"
                        disabled={loadingReceiptId === e.id}
                      >
                        <Paperclip size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => removeEntry(e.id, e.hasFoto)}
                      style={styles.deleteButton}
                      aria-label="Remover lançamento"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {viewingReceipt && (
          <div style={styles.modalOverlay} onClick={() => setViewingReceipt(null)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setViewingReceipt(null)}
                style={styles.modalCloseButton}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
              <img src={viewingReceipt} alt="Nota fiscal" style={styles.modalImage} />
            </div>
          </div>
        )}

        {tab === 'grafico' && (
          <>
            <div style={styles.sectionHeading}>
              <PieIcon size={15} />
              <span>Distribuição por categoria</span>
            </div>
            {pieData.length === 0 ? (
              <div style={styles.emptyState}>Sem dados suficientes ainda. Registre alguns gastos primeiro.</div>
            ) : (
              <div style={styles.chartCard}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <RTooltip formatter={(v) => currency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={styles.legendWrap}>
                  {pieData.map((d) => (
                    <div key={d.name} style={styles.legendItem}>
                      <span style={{ ...styles.legendDot, background: d.color }} />
                      <span style={styles.legendLabel}>{d.name}</span>
                      <span style={styles.legendValue}>{currency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ ...styles.sectionHeading, marginTop: 22 }}>
              <TrendingUp size={15} />
              <span>Últimos meses</span>
            </div>
            {monthlyTotals.length === 0 ? (
              <div style={styles.emptyState}>Sem histórico mensal ainda.</div>
            ) : (
              <div style={styles.chartCard}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={monthlyTotals}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D8" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#7A7268' }} axisLine={{ stroke: '#E8E2D8' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#7A7268' }} axisLine={false} tickLine={false} width={40} />
                    <RTooltip formatter={(v) => currency(v)} />
                    <Bar dataKey="total" fill="#C97A3D" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {tab === 'notas' && (
          <>
            <div style={styles.sectionHeading}>
              <StickyNote size={15} />
              <span>Notas</span>
            </div>
            <p style={styles.notesHint}>
              Use esse espaço pra guardar telefones de postos, hotéis, protocolos de atendimento ou qualquer anotação da viagem.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => persistNotes(notes)}
              placeholder="Ex: Posto Ipiranga BR-369 - (44) 99999-0000&#10;Hotel Central Cascavel - (45) 3222-1010"
              style={styles.notesArea}
            />
          </>
        )}

        {saving && <div style={styles.savingIndicator}>Salvando...</div>}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#F5F2ED',
    padding: '24px 16px 60px',
    fontFamily: "'Inter', sans-serif",
    color: '#2B2620',
  },
  loadingText: {
    padding: '40px',
    textAlign: 'center',
    color: '#7A7268',
    fontFamily: "'Inter', sans-serif",
  },
  container: {
    maxWidth: 480,
    margin: '0 auto',
  },
  header: {
    marginBottom: 18,
  },
  routeLine: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 14,
  },
  routeDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#C97A3D',
    flexShrink: 0,
  },
  routeTrack: {
    flex: 1,
    height: 2,
    background: 'repeating-linear-gradient(90deg, #C9A98A 0, #C9A98A 6px, transparent 6px, transparent 12px)',
    margin: '0 6px',
  },
  title: {
    fontFamily: "'Fraunces', serif",
    fontWeight: 600,
    fontSize: 30,
    margin: 0,
    letterSpacing: '-0.01em',
    color: '#211D18',
  },
  subtitle: {
    fontSize: 13.5,
    color: '#7A7268',
    margin: '4px 0 0',
  },
  tabBar: {
    display: 'flex',
    gap: 6,
    background: '#EFE9DD',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '9px 8px',
    borderRadius: 9,
    border: 'none',
    background: 'transparent',
    color: '#7A7268',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  tabButtonActive: {
    background: '#FFFFFF',
    color: '#211D18',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  errorBanner: {
    background: '#F6E4DC',
    color: '#B5533C',
    fontSize: 12.5,
    padding: '8px 12px',
    borderRadius: 10,
    marginBottom: 14,
  },
  budgetCard: {
    background: 'linear-gradient(135deg, #2B342E 0%, #1E2622 100%)',
    borderRadius: 18,
    padding: '18px 20px',
    marginBottom: 14,
  },
  budgetTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  budgetLabelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#B8C4BC',
  },
  budgetLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 600,
  },
  editBudgetButton: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: 7,
    padding: 6,
    color: '#B8C4BC',
    cursor: 'pointer',
    display: 'flex',
  },
  budgetFigures: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 10,
  },
  remainingValue: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 28,
    fontWeight: 700,
  },
  remainingLabel: {
    fontSize: 12,
    color: '#8FA096',
  },
  budgetBarTrack: {
    height: 6,
    background: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  budgetBarFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.4s ease',
  },
  budgetMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11.5,
    color: '#8FA096',
    fontFamily: "'JetBrains Mono', monospace",
  },
  setBudgetButton: {
    width: '100%',
    padding: '10px',
    borderRadius: 9,
    border: '1px dashed rgba(255,255,255,0.3)',
    background: 'transparent',
    color: '#F5F2ED',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  budgetEditRow: {
    display: 'flex',
    gap: 8,
  },
  budgetInput: {
    flex: 1,
    padding: '9px 10px',
    borderRadius: 9,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)',
    color: '#F5F2ED',
    fontSize: 14,
    fontFamily: "'JetBrains Mono', monospace",
  },
  budgetSaveButton: {
    padding: '9px 14px',
    borderRadius: 9,
    border: 'none',
    background: '#C97A3D',
    color: '#FFF',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  totalCard: {
    background: '#FFFFFF',
    border: '1px solid #E8E2D8',
    borderRadius: 16,
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 18,
  },
  totalLabel: {
    fontSize: 11.5,
    color: '#7A7268',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 600,
  },
  totalValue: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 26,
    fontWeight: 700,
    color: '#211D18',
    marginTop: 4,
  },
  totalMeta: {
    fontSize: 12,
    color: '#A39B8F',
    marginTop: 4,
  },
  formCard: {
    background: '#FFFFFF',
    border: '1px solid #E8E2D8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 22,
  },
  formRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 10,
  },
  select: {
    flex: 1.2,
    padding: '10px 10px',
    borderRadius: 10,
    border: '1px solid #DFD7C8',
    background: '#FBF9F5',
    fontSize: 14,
    color: '#2B2620',
  },
  dateInput: {
    flex: 1,
    padding: '10px 10px',
    borderRadius: 10,
    border: '1px solid #DFD7C8',
    background: '#FBF9F5',
    fontSize: 14,
    color: '#2B2620',
  },
  valorInput: {
    flex: 0.8,
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #DFD7C8',
    background: '#FBF9F5',
    fontSize: 14,
    fontFamily: "'JetBrains Mono', monospace",
  },
  descInput: {
    flex: 1.4,
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #DFD7C8',
    background: '#FBF9F5',
    fontSize: 14,
  },
  addButton: {
    width: '100%',
    padding: '12px',
    borderRadius: 10,
    border: 'none',
    background: '#C97A3D',
    color: '#FFF',
    fontSize: 14.5,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    cursor: 'pointer',
  },
  sectionHeading: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12.5,
    fontWeight: 700,
    color: '#7A7268',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 10,
    marginTop: 4,
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    marginBottom: 26,
  },
  categoryCard: {
    background: '#FFFFFF',
    border: '1px solid #E8E2D8',
    borderRadius: 14,
    padding: 12,
  },
  categoryTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  categoryInfo: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  categoryLabel: {
    fontSize: 11.5,
    color: '#7A7268',
    fontWeight: 600,
  },
  categoryValue: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 14.5,
    fontWeight: 700,
    color: '#211D18',
  },
  barTrack: {
    height: 5,
    background: '#EFE9DD',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.4s ease',
  },
  categoryCount: {
    fontSize: 11,
    color: '#A39B8F',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  emptyState: {
    padding: '20px 16px',
    textAlign: 'center',
    color: '#A39B8F',
    fontSize: 13.5,
    background: '#FFFFFF',
    border: '1px dashed #DFD7C8',
    borderRadius: 14,
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#FFFFFF',
    border: '1px solid #E8E2D8',
    borderRadius: 12,
    padding: '10px 12px',
  },
  historyMid: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  historyDesc: {
    fontSize: 13.5,
    fontWeight: 600,
    color: '#2B2620',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  historyDate: {
    fontSize: 11.5,
    color: '#A39B8F',
    marginTop: 1,
  },
  historyValue: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 14,
    fontWeight: 600,
    color: '#211D18',
    flexShrink: 0,
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    color: '#C4A99B',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    flexShrink: 0,
  },
  chartCard: {
    background: '#FFFFFF',
    border: '1px solid #E8E2D8',
    borderRadius: 16,
    padding: '16px 14px',
    marginBottom: 8,
  },
  legendWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 6,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    flexShrink: 0,
  },
  legendLabel: {
    flex: 1,
    color: '#4A443C',
  },
  legendValue: {
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
    color: '#211D18',
  },
  notesHint: {
    fontSize: 13,
    color: '#7A7268',
    marginTop: -4,
    marginBottom: 12,
    lineHeight: 1.5,
  },
  notesArea: {
    width: '100%',
    minHeight: 260,
    padding: 14,
    borderRadius: 14,
    border: '1px solid #E8E2D8',
    background: '#FFFFFF',
    fontSize: 14,
    lineHeight: 1.6,
    color: '#2B2620',
    resize: 'vertical',
  },
  savingIndicator: {
    textAlign: 'center',
    fontSize: 11.5,
    color: '#A39B8F',
    marginTop: 12,
  },
  errorText: {
    color: '#B5533C',
    fontSize: 12.5,
    marginBottom: 8,
  },
  photoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  photoButton: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px dashed #C9A98A',
    background: '#FBF9F5',
    color: '#7A5A3A',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  hiddenFileInput: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
  },
  photoPreviewWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  photoPreview: {
    width: 44,
    height: 44,
    objectFit: 'cover',
    borderRadius: 8,
    border: '1px solid #E8E2D8',
    display: 'block',
  },
  photoRemoveButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#B5533C',
    color: '#FFF',
    border: '2px solid #F5F2ED',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
  },
  receiptButton: {
    background: '#EFE9DD',
    border: 'none',
    borderRadius: 8,
    padding: 6,
    color: '#7A5A3A',
    cursor: 'pointer',
    display: 'flex',
    flexShrink: 0,
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(20, 17, 13, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 1000,
  },
  modalContent: {
    position: 'relative',
    maxWidth: '100%',
    maxHeight: '90vh',
  },
  modalCloseButton: {
    position: 'absolute',
    top: -14,
    right: -14,
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: '#F5F2ED',
    color: '#211D18',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  modalImage: {
    maxWidth: '100%',
    maxHeight: '90vh',
    borderRadius: 10,
    display: 'block',
  },
};
