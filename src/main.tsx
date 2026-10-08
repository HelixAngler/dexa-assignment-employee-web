import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/router';
import { I18nProvider } from './i18n/provider';
import { SessionProvider } from './services/session';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Missing <div id="root"></div> in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <I18nProvider>
      <SessionProvider>
        <App />
      </SessionProvider>
    </I18nProvider>
  </StrictMode>,
);
