import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// O login do Google agora passa pelo Supabase Auth (ver supabaseAuth.js),
// que devolve o crachá do banco e o token do Calendar de uma vez só.
// Por isso o provider do @react-oauth/google não é mais necessário aqui.
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
