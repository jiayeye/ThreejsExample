import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
//禁用React.StrictMode，否则会出现useEffect []调用两次的奇怪问题
root.render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode> 
);

