import { Mail } from '../../src/core/MailFacade';
import { Mailable } from '../../src/core/Mailable';
import type { MailConfig } from '../../src/types';

class WelcomeMail extends Mailable {
  build(): this {
    return this
      .subject('Welcome!')
      .html('<h1>Welcome</h1>')
      .text('Welcome');
  }
}

class PriorityMail extends Mailable {
  build(): this {
    return this
      .subject('Urgent')
      .html('<p>Important</p>')
      .priority('high');
  }
}

describe('Mail Preview (Fake Mode)', () => {
  const config: MailConfig = {
    default: 'smtp',
    from: { address: 'noreply@test.com', name: 'Test App' },
    mailers: {
      smtp: { driver: 'smtp', host: 'localhost', port: 587 },
    },
  };

  beforeEach(() => {
    Mail.configure(config);
    Mail.fake();
  });

  afterEach(() => {
    Mail.restore();
  });

  it('returns correct html, subject, to, from via fluent builder', async () => {
    const result = await Mail.to('user@example.com')
      .subject('Hello')
      .html('<p>Hi</p>')
      .preview();

    expect(result.html).toBe('<p>Hi</p>');
    expect(result.subject).toBe('Hello');
    expect(result.to).toBe('user@example.com');
  });

  it('returns text content', async () => {
    const result = await Mail.to('user@example.com')
      .subject('Hello')
      .text('Plain text')
      .preview();

    expect(result.text).toBe('Plain text');
  });

  it('applies priority headers', async () => {
    const result = await Mail.to('user@example.com')
      .subject('Urgent')
      .html('<p>Important</p>')
      .priority('high')
      .preview();

    expect(result.headers).toBeDefined();
    expect(result.headers!['X-Priority']).toBe('1');
    expect(result.headers!['X-MSMail-Priority']).toBe('High');
    expect(result.headers!['Importance']).toBe('high');
  });

  it('does NOT store the message (assertNothingSent passes)', async () => {
    await Mail.to('user@example.com')
      .subject('Hello')
      .html('<p>Hi</p>')
      .preview();

    Mail.assertNothingSent();
  });

  it('does NOT fire events (getFiredEvents is empty)', async () => {
    const fake = Mail.getFake()!;

    await Mail.to('user@example.com')
      .subject('Hello')
      .html('<p>Hi</p>')
      .preview();

    expect(fake.getFiredEvents()).toHaveLength(0);
  });

  it('works with Mailable class via Mail.preview()', async () => {
    const mailable = new WelcomeMail().to('user@example.com');
    const result = await Mail.preview(mailable);

    expect(result.subject).toBe('Welcome!');
    expect(result.html).toBe('<h1>Welcome</h1>');
    expect(result.text).toBe('Welcome');
  });

  it('works with Mailable that has priority', async () => {
    const mailable = new PriorityMail().to('user@example.com');
    const result = await Mail.preview(mailable);

    expect(result.headers).toBeDefined();
    expect(result.headers!['X-Priority']).toBe('1');
  });

  it('preview does not affect subsequent assertNothingSent with Mailable', async () => {
    const mailable = new WelcomeMail().to('user@example.com');
    await Mail.preview(mailable);

    Mail.assertNothingSent();
    Mail.assertNothingQueued();
  });

  it('includes cc and bcc in preview', async () => {
    const result = await Mail.to('user@example.com')
      .subject('Test')
      .html('<p>Hi</p>')
      .cc('cc@example.com')
      .bcc('bcc@example.com')
      .preview();

    expect(result.cc).toBe('cc@example.com');
    expect(result.bcc).toBe('bcc@example.com');
  });

  it('includes attachments in preview', async () => {
    const result = await Mail.to('user@example.com')
      .subject('Test')
      .html('<p>Hi</p>')
      .attachments([{ filename: 'file.txt', content: 'hello' }])
      .preview();

    expect(result.attachments).toHaveLength(1);
    expect(result.attachments![0].filename).toBe('file.txt');
  });

  it('includes from when set explicitly', async () => {
    const result = await Mail.to('user@example.com')
      .subject('Test')
      .html('<p>Hi</p>')
      .from('custom@example.com')
      .preview();

    expect(result.from).toBe('custom@example.com');
  });

  it('preview with low priority sets correct headers', async () => {
    const result = await Mail.to('user@example.com')
      .subject('Low')
      .html('<p>Low</p>')
      .priority('low')
      .preview();

    expect(result.headers!['X-Priority']).toBe('5');
    expect(result.headers!['X-MSMail-Priority']).toBe('Low');
    expect(result.headers!['Importance']).toBe('low');
  });

  it('preview with normal priority sets correct headers', async () => {
    const result = await Mail.to('user@example.com')
      .subject('Normal')
      .html('<p>Normal</p>')
      .priority('normal')
      .preview();

    expect(result.headers!['X-Priority']).toBe('3');
    expect(result.headers!['X-MSMail-Priority']).toBe('Normal');
    expect(result.headers!['Importance']).toBe('normal');
  });
});
