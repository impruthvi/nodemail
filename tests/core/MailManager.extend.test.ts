import { MailManager } from '../../src/core/MailManager';
import { Mail } from '../../src/core/MailFacade';
import type { MailConfig, MailerConfig, MailProvider } from '../../src/types';

const mockSend = jest.fn().mockResolvedValue({ success: true, messageId: 'custom-123' });

function makeCustomProvider(): MailProvider {
  return { send: mockSend };
}

function baseConfig(driver: string = 'custom-driver'): MailConfig {
  return {
    default: 'custom',
    from: { address: 'test@example.com', name: 'Test' },
    mailers: {
      custom: { driver } as MailerConfig,
    },
  };
}

describe('Mail.extend()', () => {
  afterEach(() => {
    MailManager.clearCustomProviders();
    Mail.restore();
    mockSend.mockClear();
  });

  it('should register and use a custom provider for sending', async () => {
    MailManager.extend('custom-driver', () => makeCustomProvider());
    const manager = new MailManager(baseConfig());

    const result = await manager.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('custom-123');
    expect(mockSend).toHaveBeenCalled();
  });

  it('should pass config to factory function', async () => {
    const factory = jest.fn().mockReturnValue(makeCustomProvider());
    MailManager.extend('custom-driver', factory);

    const config = baseConfig();
    (config.mailers['custom'] as Record<string, unknown>)['apiKey'] = 'test-key';
    const manager = new MailManager(config);

    await manager.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(factory).toHaveBeenCalledWith(
      expect.objectContaining({ driver: 'custom-driver', apiKey: 'test-key' })
    );
  });

  it('should throw if factory returns object without send() method', async () => {
    MailManager.extend('bad-driver', () => ({} as unknown as MailProvider));
    const manager = new MailManager(baseConfig('bad-driver'));

    await expect(
      manager.send({ to: 'user@example.com', subject: 'Test', html: '<p>Hello</p>' })
    ).rejects.toThrow('must return an object with a send() method');
  });

  it('should allow custom provider to override built-in driver', async () => {
    MailManager.extend('smtp', () => makeCustomProvider());
    const manager = new MailManager({
      default: 'mysmtp',
      from: { address: 'test@example.com', name: 'Test' },
      mailers: {
        mysmtp: { driver: 'smtp', host: 'localhost', port: 25 } as MailerConfig,
      },
    });

    const result = await manager.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(result.messageId).toBe('custom-123');
  });

  it('should check custom providers before built-in switch', async () => {
    const customFactory = jest.fn().mockReturnValue(makeCustomProvider());
    MailManager.extend('smtp', customFactory);

    const manager = new MailManager({
      default: 'mysmtp',
      from: { address: 'test@example.com', name: 'Test' },
      mailers: {
        mysmtp: { driver: 'smtp', host: 'localhost', port: 25 } as MailerConfig,
      },
    });

    await manager.send({ to: 'user@example.com', subject: 'Test', html: '<p>Hi</p>' });
    expect(customFactory).toHaveBeenCalled();
  });

  it('should work through Mail.extend() facade', async () => {
    Mail.configure(baseConfig());
    Mail.extend('custom-driver', () => makeCustomProvider());

    const result = await Mail.to('user@example.com').subject('Test').html('<p>Hi</p>').send();
    expect(result.success).toBe(true);
  });

  it('should work with Mail.configure() using custom driver string', async () => {
    MailManager.extend('my-api', () => makeCustomProvider());
    Mail.configure({
      default: 'api',
      from: { address: 'test@example.com', name: 'Test' },
      mailers: {
        api: { driver: 'my-api' } as MailerConfig,
      },
    });

    const result = await Mail.to('user@example.com').subject('Test').html('<p>Hi</p>').send();
    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalled();
  });

  it('should clear custom providers', async () => {
    MailManager.extend('custom-driver', () => makeCustomProvider());
    MailManager.clearCustomProviders();

    const manager = new MailManager(baseConfig());
    await expect(
      manager.send({ to: 'user@example.com', subject: 'Test', html: '<p>Hi</p>' })
    ).rejects.toThrow('Unsupported mail driver');
  });

  it('should throw for unknown driver when no custom provider registered', async () => {
    const manager = new MailManager(baseConfig('unknown'));
    await expect(
      manager.send({ to: 'user@example.com', subject: 'Test', html: '<p>Hi</p>' })
    ).rejects.toThrow('Unsupported mail driver: unknown');
  });
});
