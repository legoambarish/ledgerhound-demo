import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </React.StrictMode>,
);

// Dev-only handle for scripted checks in the browser console.
if (import.meta.env.DEV) {
  void import('./sim/store').then(({ useSim }) => ((window as unknown as { __sim: typeof useSim }).__sim = useSim));
}
