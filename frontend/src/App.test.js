import { render, screen } from '@testing-library/react';
import App from './App';
import { UserProvider } from './UserContext';
import { FeedbackProvider } from './components/Feedback/FeedbackProvider';

test('renders the landing page for signed-out users', () => {
  render(
    <FeedbackProvider>
      <UserProvider>
        <App />
      </UserProvider>
    </FeedbackProvider>
  );
  expect(screen.getAllByRole('heading', { name: /^krypt$/i }).length).toBeGreaterThan(0);
  expect(screen.getByRole('link', { name: /start/i })).toBeInTheDocument();
});
