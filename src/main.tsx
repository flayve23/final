import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// V101: Removed React.StrictMode to prevent double-mount effects with WebRTC/LiveKit
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
