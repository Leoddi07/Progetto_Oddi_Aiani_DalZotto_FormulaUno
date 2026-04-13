# FANalytics — Data Engineering

Script di raccolta, pulizia e inserimento dati F1 da **F1api.dev**.

**Responsabile:** [nome membro del gruppo]

---

## Avvio

```bash
# 1. Installa dipendenze
npm install

# 2. Crea il file .env
cp .env.example .env
# → inserisci le credenziali MySQL

# 3. Assicurati che il database sia creato (esegui prima database/schema/)

# 4. Avvia la pipeline completa
npm start

# Oppure solo una parte:
npm run fetch-drivers   # solo piloti e scuderie
npm run fetch-races     # solo gare, risultati e pit stop
```

---

## Struttura

```
data-engineering/
├── index.js                  ← entry point, coordina la pipeline
├── package.json
├── .env.example
├── scrapers/
│   └── f1ApiScraper.js       ← chiamate HTTP a F1api.dev
├── cleaners/
│   └── dataCleaner.js        ← pulizia e normalizzazione dati
└── loaders/
    └── saveToDb.js           ← inserimento nel database MySQL
```

---

## Pipeline di dati

```
F1api.dev
    │
    ▼
scrapers/f1ApiScraper.js     ← fetch HTTP, retry automatico
    │  (dati grezzi JSON)
    ▼
cleaners/dataCleaner.js      ← normalizzazione, validazione, deduplicazione
    │  (dati puliti)
    ▼
loaders/saveToDb.js          ← INSERT/UPDATE nel DB MySQL (upsert)
    │
    ▼
Database fanalytics (MySQL)
```

---

## Operazioni di cleaning eseguite

- Rimozione valori `null` / `undefined`
- Normalizzazione stringhe (trim, spazi multipli)
- Conversione date → formato `YYYY-MM-DD`
- Conversione tempi pit stop → secondi decimali
- Deduplicazione scuderie (stessa scuderia non inserita due volte)
- Mappatura varianti nomi campo API → campi DB
- Validazione dati obbligatori (scarta record incompleti)
- Mappatura status gara → ENUM MySQL (`finito`, `ritirato`, `squalificato`)

---

## Endpoint F1api.dev utilizzati

| Endpoint | Dati |
|----------|------|
| `GET /api/{season}/drivers` | Piloti e scuderie |
| `GET /api/{season}/races` | Calendario gare |
| `GET /api/{season}/{round}/results` | Classifica gara |
| `GET /api/{season}/{round}/pitstops` | Pit stop gara |
| `GET /api/current/next` | Prossima gara |

Documentazione completa: [https://f1api.dev](https://f1api.dev)
