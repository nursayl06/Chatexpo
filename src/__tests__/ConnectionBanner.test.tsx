import { render, screen } from '@testing-library/react-native';

import { ConnectionBanner } from '@/components/ConnectionBanner';

describe('ConnectionBanner', () => {
  it('is hidden when the chat is connected', async () => {
    await render(<ConnectionBanner status="online" queuedCount={0} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('tells the user that queued messages will be sent later', async () => {
    await render(<ConnectionBanner status="offline" queuedCount={2} />);
    expect(screen.getByText('No internet connection. 2 message(s) will be sent automatically.')).toBeOnTheScreen();
  });

  it('shows the reconnecting state', async () => {
    await render(<ConnectionBanner status="connecting" queuedCount={0} />);
    expect(screen.getByText('Connecting to the chat…')).toBeOnTheScreen();
  });
});
