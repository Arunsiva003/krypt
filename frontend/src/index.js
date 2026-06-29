import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { UserProvider } from './UserContext';
import { FeedbackProvider } from './components/Feedback/FeedbackProvider';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <FeedbackProvider>
      <UserProvider>
        <App />
      </UserProvider>
    </FeedbackProvider>
  </React.StrictMode>
);
