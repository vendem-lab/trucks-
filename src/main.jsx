import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './lib/firebase.js';

import './styles/base.css';
import './styles/layout.css';
import './styles/pages.css';
import './styles/admin.css';
import './styles/union.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
