import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Polyfill do window.storage usando o localStorage do próprio navegador do celular.
// Mantém a mesma "forma" de resposta usada no App.jsx: get() rejeita quando a
// chave não existe, set() e delete() devolvem um objeto de confirmação.
const PREFIX = 'rdv-stoller:';

window.storage = {
  async get(key) {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) {
      throw new Error(`Chave "${key}" não encontrada`);
    }
    return { key, value: raw, shared: false };
  },
  async set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, value);
      return { key, value, shared: false };
    } catch (e) {
      // Provavelmente estourou o limite de armazenamento do navegador
      console.error('Falha ao salvar no localStorage:', e);
      return null;
    }
  },
  async delete(key) {
    localStorage.removeItem(PREFIX + key);
    return { key, deleted: true, shared: false };
  },
  async list(prefix = '') {
    const keys = Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX + prefix))
      .map((k) => k.slice(PREFIX.length));
    return { keys, prefix, shared: false };
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
