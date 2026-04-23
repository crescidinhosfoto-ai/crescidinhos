import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';

// ⚠️ PASSO 1: Substitua pelo seu Client ID do Google Cloud Console
const GOOGLE_CLIENT_ID = "512878174769-g2ip5akuc2o89jdro3vkqoqu7gj3pif2.apps.googleusercontent.com";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
