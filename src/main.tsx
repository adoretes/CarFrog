import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { useSessionStore } from './store/sessionStore'
import './styles/index.css'

void useSessionStore.getState().init()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
