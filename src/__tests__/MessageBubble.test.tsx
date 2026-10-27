import { fireEvent, render, screen } from '@testing-library/react-native';

import { MessageBubble, type ChatMessageView } from '@/components/MessageBubble';

const base: ChatMessageView = {
  key: 'c-1',
  text: 'Hello from Almaty',
  imageUri: undefined,
  authorName: 'ann',
  authorAvatar: null,
  createdAt: '2026-10-26T09:05:00',
  status: 'sent',
};

describe('MessageBubble', () => {
  it("shows the text and the author's name for other people's messages", async () => {
    await render(<MessageBubble message={base} isMine={false} />);
    expect(screen.getByText('Hello from Almaty')).toBeOnTheScreen();
    expect(screen.getByText('ann')).toBeOnTheScreen();
    expect(screen.getByText('09:05')).toBeOnTheScreen();
  });

  it('hides the author name on my own messages and shows the delivery status', async () => {
    await render(<MessageBubble message={{ ...base, status: 'queued' }} isMine />);
    expect(screen.queryByText('ann')).toBeNull();
    expect(screen.getByText('Waiting for connection')).toBeOnTheScreen();
  });

  it('lets the user retry a failed message', async () => {
    const onRetry = jest.fn();
    await render(<MessageBubble message={{ ...base, status: 'failed' }} isMine onRetry={onRetry} />);
    await fireEvent.press(screen.getByText('Not sent · tap to retry'));
    expect(onRetry).toHaveBeenCalledWith('c-1');
  });

  it('opens the photo when it is tapped', async () => {
    const onPressImage = jest.fn();
    await render(
      <MessageBubble message={{ ...base, imageUri: 'https://example.com/a.jpg' }} isMine={false} onPressImage={onPressImage} />,
    );
    await fireEvent.press(screen.getByLabelText('Open photo'));
    expect(onPressImage).toHaveBeenCalledWith('https://example.com/a.jpg');
  });
});
