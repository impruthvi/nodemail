import { MailManager } from '../../src/core/MailManager';
import type { MailConfig, MailOptions } from '../../src/types';

// Mock the SmtpProvider
jest.mock('../../src/providers/SmtpProvider', () => ({
  SmtpProvider: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  })),
}));

const createManager = (): MailManager => {
  const config: MailConfig = {
    default: 'smtp',
    from: { address: 'sender@example.com', name: 'Test' },
    mailers: {
      smtp: {
        driver: 'smtp',
        host: 'localhost',
        port: 587,
      } as any,
    },
  };
  return new MailManager(config);
};

describe('MailManager priority', () => {
  it('should convert high priority to correct headers', async () => {
    const manager = createManager();
    const provider = (manager as any).getProvider();
    const sendSpy = provider.send as jest.Mock;

    await manager.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      priority: 'high',
    });

    const sentOptions: MailOptions = sendSpy.mock.calls[0][0];
    expect(sentOptions.headers).toEqual({
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high',
    });
  });

  it('should convert normal priority to correct headers', async () => {
    const manager = createManager();
    const provider = (manager as any).getProvider();
    const sendSpy = provider.send as jest.Mock;

    await manager.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      priority: 'normal',
    });

    const sentOptions: MailOptions = sendSpy.mock.calls[0][0];
    expect(sentOptions.headers).toEqual({
      'X-Priority': '3',
      'X-MSMail-Priority': 'Normal',
      'Importance': 'normal',
    });
  });

  it('should convert low priority to correct headers', async () => {
    const manager = createManager();
    const provider = (manager as any).getProvider();
    const sendSpy = provider.send as jest.Mock;

    await manager.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      priority: 'low',
    });

    const sentOptions: MailOptions = sendSpy.mock.calls[0][0];
    expect(sentOptions.headers).toEqual({
      'X-Priority': '5',
      'X-MSMail-Priority': 'Low',
      'Importance': 'low',
    });
  });

  it('should not add headers when priority is not set', async () => {
    const manager = createManager();
    const provider = (manager as any).getProvider();
    const sendSpy = provider.send as jest.Mock;

    await manager.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    const sentOptions: MailOptions = sendSpy.mock.calls[0][0];
    expect(sentOptions.headers).toBeUndefined();
  });

  it('should preserve existing user headers', async () => {
    const manager = createManager();
    const provider = (manager as any).getProvider();
    const sendSpy = provider.send as jest.Mock;

    await manager.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      priority: 'high',
      headers: { 'X-Custom': 'value' },
    });

    const sentOptions: MailOptions = sendSpy.mock.calls[0][0];
    expect(sentOptions.headers!['X-Custom']).toBe('value');
    expect(sentOptions.headers!['X-Priority']).toBe('1');
  });

  it('should let user headers override priority headers', async () => {
    const manager = createManager();
    const provider = (manager as any).getProvider();
    const sendSpy = provider.send as jest.Mock;

    await manager.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      priority: 'high',
      headers: { 'X-Priority': '2' },
    });

    const sentOptions: MailOptions = sendSpy.mock.calls[0][0];
    expect(sentOptions.headers!['X-Priority']).toBe('2');
  });

  it('should work through MessageBuilder chain', async () => {
    const manager = createManager();
    const provider = (manager as any).getProvider();
    const sendSpy = provider.send as jest.Mock;

    await manager
      .to('user@example.com')
      .subject('Test')
      .html('<p>Hello</p>')
      .priority('high')
      .send();

    const sentOptions: MailOptions = sendSpy.mock.calls[0][0];
    expect(sentOptions.priority).toBe('high');
  });
});
