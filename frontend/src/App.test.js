import { render, screen } from '@testing-library/react';
import App from './App';
import { UserProvider } from './UserContext';
import { FeedbackProvider } from './components/Feedback/FeedbackProvider';
import api from './api/client';

jest.mock('./api/client', () => {
  const actual = jest.requireActual('./api/client');
  return {
    __esModule: true,
    ...actual,
    default: {
      ...actual.default,
      get: jest.fn(),
      post: jest.fn(),
    },
  };
});

test('renders the landing page for signed-out users', async () => {
  api.get.mockRejectedValueOnce(new Error('signed out'));
  render(
    <FeedbackProvider>
      <UserProvider>
        <App />
      </UserProvider>
    </FeedbackProvider>
  );
  expect((await screen.findAllByRole('heading', { name: /^krypt$/i })).length).toBeGreaterThan(0);
  expect(screen.getByRole('link', { name: /start/i })).toBeInTheDocument();
});
