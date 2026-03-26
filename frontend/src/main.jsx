import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// Log Google OAuth setup
if (!GOOGLE_CLIENT_ID) {
  console.warn('⚠️ VITE_GOOGLE_CLIENT_ID is not configured. Google OAuth button will be disabled.')
} else if (GOOGLE_CLIENT_ID === 'your-google-client-id-here') {
  console.warn('⚠️ Using placeholder Google Client ID. Get a real one from Google Cloud Console.')
}

const root = createRoot(document.getElementById('root'))

// Only render GoogleOAuthProvider if we have a client ID
const AppContent = () => {
  return (
    <StrictMode>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || ""}>
        <BrowserRouter>
          <App />
          <Toaster position="top-right" />
        </BrowserRouter>
      </GoogleOAuthProvider>
    </StrictMode>
  )
}

root.render(<AppContent />)
