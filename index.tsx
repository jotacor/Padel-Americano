import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter';
import './index.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.tsx';
import GameViewer from './GameViewer.tsx';
import LeaderboardDisplay from './LeaderboardDisplay.tsx';
import { I18nProvider } from './i18n/I18nContext.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Critical Error: Could not find root element with ID 'root'");
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <I18nProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/game/:id" element={<GameViewer />} />
            <Route path="/display/:id" element={<LeaderboardDisplay />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </React.StrictMode>
  );
}
