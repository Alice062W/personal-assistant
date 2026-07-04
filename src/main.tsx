import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter as BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'

registerSW({ immediate: true })

// Play alarm sound when the service worker signals a limit breach
navigator.serviceWorker?.addEventListener('message', event => {
  if (event.data?.type === 'PLAY_ALARM') {
    playAlarmSound()
  }
})

function playAlarmSound() {
  const ctx = new AudioContext()
  const times = [0, 0.4, 0.8]
  times.forEach(t => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.6, ctx.currentTime + t)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35)
    osc.start(ctx.currentTime + t)
    osc.stop(ctx.currentTime + t + 0.35)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
