import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/object-workspace.css'
// Font Awesome — must disable auto-CSS and import it manually for Vite compatibility
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
config.autoAddCss = false

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
