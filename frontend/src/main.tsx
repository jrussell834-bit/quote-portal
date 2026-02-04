import React from 'react';
import ReactDOM from 'react-dom/client';
import './style.css';
import { AuthApp } from './ui/AuthApp';

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <AuthApp />
  </React.StrictMode>
);

