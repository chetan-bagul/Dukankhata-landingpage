import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Each page is its own chunk, so landing-page CSS and web-app (Tailwind) CSS never load together.
// The two pages link to each other with normal <a href> links (full page load) to keep it that way.
const Landing = lazy(() => import('./landing/Landing.jsx'));
const WebApp = lazy(() => import('./web-app/WebApp'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app/*" element={<WebApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>
);
