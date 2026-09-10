import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import './css/globals.css';

if (import.meta.env.DEV) {
  window.addEventListener('load', () => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (registrations.length > 0) {
        Promise.all(registrations.map((reg) => reg.unregister())).then(() => {
          if ('caches' in window) {
            window.caches.keys().then((keys) => keys.forEach((key) => window.caches.delete(key)));
          }
          window.setTimeout(() => {
            if (!window.sessionStorage.getItem('passco-sw-purged')) {
              window.sessionStorage.setItem('passco-sw-purged', '1');
              window.location.replace('/');
            }
          }, 250);
        });
      }
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
