// Connessione al database MySQL

const mysql = require('mysql2/promise')

// Pool di connessioni che gestisce automaticamente più richieste contemporanee per una maggiore efficienza
const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,   // massimo di 10 connessioni parallele
  queueLimit:         0,
})

// Test di connessione all'avvio
pool.getConnection()
  .then(conn => {
    console.log('Connessione MySQL riuscita')
    conn.release()
  })
  .catch(err => {
    console.error('Errore connessione MySQL:', err.message)
  })

module.exports = pool
