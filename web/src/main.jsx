import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './i18n.js';
import './styles.css';
import 'gridstack/dist/gridstack.min.css';

createRoot(document.getElementById('root')).render(<App />);
