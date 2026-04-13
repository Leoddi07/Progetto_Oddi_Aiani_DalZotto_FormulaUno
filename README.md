# Progetto_Oddi_Aiani_DalZotto_FormulaUno

# FANalytics — Frontend

Interfaccia web della piattaforma, sviluppata in **React 18 + Vite**.

**Responsabile:** Aiani

---

## Avvio

```bash
npm install
npm run dev
# http://localhost:5173
```

## Struttura

```
frontend/
├── index.html
├── package.json
├── vite.config.js          ← proxy verso backend :3001
└── src/
    ├── main.jsx             ← entry point
    ├── App.jsx              ← routing principale
    ├── index.css            ← stili globali + variabili CSS
    ├── context/
    │   └── AuthContext.jsx  ← stato login globale
    ├── components/
    │   └── Sidebar.jsx      ← barra navigazione
    ├── services/
    │   └── api.js           ← 🔌 tutti i collegamenti al backend
    └── pages/
        ├── LoginPage.jsx
        ├── DashboardPage.jsx
        ├── RacesPage.jsx
        ├── PredictPage.jsx
        └── AdminPage.jsx
```

## Collegare il backend

Tutti i collegamenti al backend sono in `src/services/api.js`.  
Ogni funzione contiene:
- 🔴 Mock attivo (funziona senza backend)
- 🟢 Chiamata fetch reale commentata (da decommentare quando il backend è pronto)

Il proxy Vite in `vite.config.js` inoltra `/api/*` → `http://localhost:3001`.
