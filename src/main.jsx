import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Sync dark mode with system preference
const applyColorScheme = () => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', prefersDark);
};
applyColorScheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyColorScheme);

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)