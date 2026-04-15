# Progetto_Oddi_Aiani_DalZotto_FormulaUno

> Piattaforma di sport analytics dedicata alla Formula 1.  
> Progetto scolastico — Classe 5DIA, ITT Sangallo, A.S. 2025/2026  
> **Autori:** Oddi · Aiani · Dal Zotto

---

## Indice

- [Descrizione](#descrizione)
- [Tecnologie](#tecnologie)
- [Struttura del progetto](#struttura-del-progetto)
- [Avvio rapido](#avvio-rapido)
- [Frontend](#frontend)
- [Backend](#backend)
- [Database](#database)
- [Data Engineering](#data-engineering)

---

## Descrizione

**FANalytics** è una piattaforma web che raccoglie, analizza e visualizza dati sportivi della Formula 1 tramite l'API pubblica [F1api.dev](https://f1api.dev).

Permette a tifosi, analisti e amministratori di:
- consultare la classifica piloti e costruttori in tempo reale
- analizzare i risultati delle gare e i tempi ai pit stop
- ottenere una previsione probabilistica sull'esito di una gara tra due scuderie
- gestire utenti e dati tramite un pannello di amministrazione

---

## Tecnologie

| Componente       | Tecnologia                     |
|------------------|--------------------------------|
| Frontend         | React 18 + Vite                |
| Backend          | Node.js + Express              |
| Database         | MySQL                          |
| Data Engineering | Node.js + node-fetch           |
| Autenticazione   | JWT + bcrypt                   |
| Fonte dati F1    | [F1api.dev](https://f1api.dev) |

---

## Struttura del progetto

```
Progetto_Oddi_Aiani_DalZotto_FormulaUno/
│
├── frontend/          ← Interfaccia web (React + Vite)        [Aiani]
├── backend/           ← Server API REST (Node.js + Express)   [Dal Zotto]
├── database/          ← Schema MySQL + dati di esempio        [Oddi]
└── data-engineering/  ← Raccolta e pulizia dati da F1api.dev  [Dal Zotto]
```

---

## Avvio rapido

### Prerequisiti
- [Node.js](https://nodejs.org) v18 o superiore
- MySQL 8.0 o superiore

### 1 — Backend
```bash
cd backend
npm install
npm run dev                 # → http://localhost:3001
```

### 2 — Frontend
```bash
cd frontend
npm install
npm run dev                 # → http://localhost:5173
```

### 3 — Data Engineering (popola il DB con dati reali)
```bash
cd data-engineering
npm install
node index.js
```

> **Account di default:** `admin` / `admin`

---

## Frontend

Interfaccia web della piattaforma, sviluppata in **React 18 + Vite**.

**Responsabile:** Aiani

### Avvio

```bash
npm install
npm run dev
# http://localhost:5173
```

### Struttura

```
frontend/
├── index.html
├── package.json
├── vite.config.js              ← proxy verso backend :3001
└── src/
    ├── main.jsx                ← entry point
    ├── App.jsx                 ← routing principale
    ├── index.css               ← stili globali + variabili CSS
    ├── context/
    │   └── AuthContext.jsx     ← stato login globale
    ├── components/
    │   └── Sidebar.jsx         ← barra navigazione laterale
    ├── services/
    │   └── api.js              ← 🔌 tutti i collegamenti al backend
    └── pages/
        ├── LoginPage.jsx       ← login + registrazione
        ├── DashboardPage.jsx   ← classifica piloti e costruttori
        ├── RacesPage.jsx       ← calendario gare e pit stop
        ├── PredictPage.jsx     ← previsione risultato gara
        └── AdminPage.jsx       ← pannello amministrazione
```

### Collegare il backend

Tutti i collegamenti al backend sono in `src/services/api.js`.  
Ogni funzione contiene:
- 🟢 Chiamata fetch reale commentata (da decommentare quando il backend è pronto)

Il proxy Vite in `vite.config.js` inoltra `/api/*` → `http://localhost:3001`.

---

## Backend

Server API REST sviluppato in **Node.js + Express**.  
Gestisce autenticazione, lettura dati dal DB e l'algoritmo di previsione.

**Responsabile:** Dal Zotto

### Avvio

```bash
cd backend
npm install
npm run dev
```

Verifica: `http://localhost:3001/api/health`

### Struttura

```
backend/
├── server.js                       ← entry point Express
├── .env.example                    ← template variabili d'ambiente
├── models/
│   └── db.js                       ← connessione MySQL (pool)
├── middleware/
│   └── auth.js                     ← verifica JWT + controllo ruolo admin
├── rotte/
│   ├── auth.js                     ← POST /api/auth/login|register
│   ├── drivers.js                  ← GET  /api/drivers
│   ├── teams.js                    ← GET  /api/teams
│   ├── races.js                    ← GET  /api/races, /next, /results/:id, /pitstops
│   ├── predict.js                  ← POST /api/predict
│   └── admin.js                    ← /api/admin/* (solo admin)
└── prediction/
    └── predictionAlgorithm.js      ← algoritmo previsione gara
```

### Endpoint principali

| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login |
| POST | `/api/auth/register` | No | Registrazione |
| GET | `/api/drivers` | No | Classifica piloti |
| GET | `/api/teams` | No | Classifica costruttori |
| GET | `/api/races` | No | Gare disputate |
| GET | `/api/races/next` | No | Prossima gara |
| GET | `/api/races/results/:id` | No | Risultati gara |
| GET | `/api/races/pitstops` | No | Pit stop medi per team |
| POST | `/api/predict` | No | Previsione risultato |
| GET | `/api/admin/users` | Admin | Lista utenti |
| DELETE | `/api/admin/users/:id` | Admin | Elimina utente |
| PUT | `/api/admin/users/:id/reset` | Admin | Reset password |
| PUT | `/api/admin/team-power` | Admin | Aggiorna `indice_potenza` scuderia |
| PUT | `/api/admin/circuit-index` | Admin | Aggiorna `indice_imprevedibilita` circuito |

### Algoritmo di previsione

Il file `algorithms/predictionAlgorithm.js` stima la probabilità di vittoria tra due scuderie su un circuito specifico usando dati reali dal database.

**Variabili considerate:**
- `indice_potenza` della scuderia (inserito dall'admin, scala 0–100)
- Vittorie stagionali e punti totali
- Posizione media in classifica
- Tempo medio ai pit stop
- `indice_imprevedibilita` del circuito (inserito dall'admin, scala 0.00–1.00)

**Formula:**
```
score = (indice_potenza × 0.4) + (vittorie × 30) + (punti × 0.3) + pit_bonus − (pos_media × 5)
draw  = indice_imprevedibilita × 100
prob  = score / (score_A + score_B + draw)
```

**Output:**
```json
{
  "win_team1": 50,
  "draw": 20,
  "win_team2": 30,
  "analysis": "Descrizione testuale...",
  "circuit_factor": "Indice imprevedibilita Monaco: 80%",
  "reliability": "Alta (78%)"
}
```

---

## Database

Schema relazionale MySQL per i dati della stagione F1.

**Responsabile:** Oddi

### Note progettuali

- `indice_potenza` e `indice_imprevedibilita` vengono inseriti **manualmente dall'admin** e non sono mai sovrascritti dalla pipeline automatica.
- `RISULTATO` è la tabella associativa N:M tra `PILOTA` e `GARA`.
- `PITSTOP` è separato da `RISULTATO` per consentire analisi strategiche indipendenti.
- Il database è normalizzato in **Terza Forma Normale (3NF)**.

---

## Data Engineering

Pipeline automatica per raccogliere, pulire e inserire i dati F1 nel database.

**Responsabile:** Dal Zotto

### Avvio

```bash
cd data-engineering
npm install
node index.js
```

### Struttura

```
data-engineering/
├── index.js                    ← entry point, coordina la pipeline
├── scraper/
│   └── f1ApiScraper.js         ← chiamate HTTP a F1api.dev
├── cleaner/
│   └── dataCleaner.js          ← normalizzazione e validazione dati
└── loader/
    └── saveToDb.js             ← INSERT/UPDATE nel database MySQL
```

### Pipeline

```
F1api.dev
    │
    ▼
f1ApiScraper.js    ← fetch HTTP con retry automatico
    │ (JSON grezzo)
    ▼
dataCleaner.js     ← normalizzazione, validazione, deduplicazione
    │ (dati puliti)
    ▼
saveToDb.js        ← upsert nel DB (non sovrascrive indici admin)
    │
    ▼
MySQL — fanalytics
```

### Endpoint F1api.dev utilizzati

| Endpoint | Dati recuperati |
|----------|-----------------|
| `GET /api/current` | Calendario completo + vincitori già inclusi |
| `GET /api/current/drivers-championship` | Classifica piloti + info team |
| `GET /api/current/constructors-championship` | Classifica costruttori |
| `GET /api/current/next` | Prossima gara in calendario |

> ⚠️ L'endpoint `/api/{year}/races` **non esiste** in F1api.dev.  
> Il calendario viene da `/api/current`, che include già i vincitori di ogni gara.

### Operazioni di cleaning eseguite

- Normalizzazione stringhe (trim, spazi multipli)
- Conversione date → formato `YYYY-MM-DD`
- Parsing `circuitLength` da `"5278km"` → numero decimale
- Deduplicazione circuiti e scuderie
- Scarto record con campi obbligatori mancanti
- Inferenza `tipologia` circuito dal nome (permanente / cittadino / misto)

### Nota sull'utente admin

Ad ogni esecuzione della pipeline, viene chiamata `ensureAdminUser()` che garantisce l'esistenza dell'account `admin`/`admin` nel database, anche in caso di eliminazione accidentale.