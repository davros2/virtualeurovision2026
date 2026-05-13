import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Admin from './Admin.jsx' // Import the new Admin component

// Check the URL for "?admin=true"
const isAdmin = window.location.search.includes('admin=true');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* If the URL has the admin flag, show the Scoreboard. Otherwise, show the Voter app. */}
    {isAdmin ? <Admin /> : <App />}
  </StrictMode>,
)