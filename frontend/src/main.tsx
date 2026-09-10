import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { WorkoutProvider } from './context/WorkoutContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <WorkoutProvider>
        <App />
      </WorkoutProvider>
    </AuthProvider>
  </StrictMode>
);
