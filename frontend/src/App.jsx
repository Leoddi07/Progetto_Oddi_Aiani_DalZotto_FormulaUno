
// src/App.jsx
//
// Componente radice dell'applicazione.
// Gestisce il routing (navigazione tra le pagine) e
// protegge le rotte che richiedono autenticazione.
//
// Struttura rotte:
//   /           → redirect a /login
//   /login      → LoginPage (pubblica)
//   /dashboard  → DashboardPage (richiede login)
//   /races      → RacesPage (richiede login)
//   /predict    → PredictPage (richiede login)
//   /admin      → AdminPage (richiede login + ruolo admin)


import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'

// Pagine
import LoginPage     from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import RacesPage     from './pages/RacesPage.jsx'
import PredictPage   from './pages/PredictPage.jsx'
import AdminPage     from './pages/AdminPage.jsx'

// Layout con sidebar
import Sidebar from './components/sidebar.jsx'

// ProtectedRoute — avvolge le pagine che richiedono login
// Se l'utente non è loggato, lo manda al /login

function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth()
  const location = useLocation()

  if (!isLoggedIn) {
    // Salviamo la pagina che stava cercando di raggiungere
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}

// AppLayout — Layout con sidebar + contenuto
// Usato per tutte le pagine autenticate

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-content">
        {children}
      </main>
    </div>
  )
}


// Router principale

function AppRoutes() {
  return (
    <Routes>
      {/* Redirect radice → login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Pagina pubblica: Login */}
      <Route path="/login" element={<LoginPage />} />

      {/* Pagine protette (richiedono login) */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppLayout><DashboardPage /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/races" element={
        <ProtectedRoute>
          <AppLayout><RacesPage /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/predict" element={
        <ProtectedRoute>
          <AppLayout><PredictPage /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Pagina admin (la protezione extra è dentro AdminPage stessa) */}
      <Route path="/admin" element={
        <ProtectedRoute>
          <AppLayout><AdminPage /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Catch-all: qualsiasi URL non riconosciuto → dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

// App — entry point con provider

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
