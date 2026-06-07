import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import './i18n';
import './index.css';
import App from './App';
import { DialogProvider } from './context/DialogContext';

if (localStorage.getItem('darkMode') === 'true') {
  document.documentElement.classList.add('dark');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <DialogProvider>
        <App />
      </DialogProvider>
    </Provider>
  </React.StrictMode>
);
