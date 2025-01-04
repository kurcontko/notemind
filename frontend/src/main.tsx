import React from 'react';
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Add flex layout to root element
const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.classList.add("flex", "w-full"); // Add flex to enable sidebar layout and w-full to ensure full width
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} else {
  console.error('Failed to find the root element');
}
