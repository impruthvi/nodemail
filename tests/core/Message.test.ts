import { Message } from '../../src/core/Message';

describe('Message', () => {
  let message: Message;

  beforeEach(() => {
    message = new Message();
  });

  describe('fluent methods', () => {
    it('should set to and return this', () => {
      const result = message.to('test@example.com');
      expect(result).toBe(message);
      expect(message.toOptions().to).toBe('test@example.com');
    });

    it('should set to with array', () => {
      message.to(['a@test.com', 'b@test.com']);
      expect(message.toOptions().to).toEqual(['a@test.com', 'b@test.com']);
    });

    it('should set to with MailAddress', () => {
      message.to({ address: 'a@test.com', name: 'A' });
      expect(message.toOptions().to).toEqual({ address: 'a@test.com', name: 'A' });
    });

    it('should set to with MailAddress array', () => {
      message.to([{ address: 'a@test.com', name: 'A' }]);
      expect(message.toOptions().to).toEqual([{ address: 'a@test.com', name: 'A' }]);
    });

    it('should set from', () => {
      const result = message.from('sender@example.com');
      expect(result).toBe(message);
      expect(message.toOptions().from).toBe('sender@example.com');
    });

    it('should set from with MailAddress', () => {
      message.from({ address: 'sender@test.com', name: 'Sender' });
      expect(message.toOptions().from).toEqual({ address: 'sender@test.com', name: 'Sender' });
    });

    it('should set subject', () => {
      const result = message.subject('Test Subject');
      expect(result).toBe(message);
      expect(message.toOptions().subject).toBe('Test Subject');
    });

    it('should set html', () => {
      const result = message.html('<p>Hello</p>');
      expect(result).toBe(message);
      expect(message.toOptions().html).toBe('<p>Hello</p>');
    });

    it('should set text', () => {
      const result = message.text('Hello');
      expect(result).toBe(message);
      expect(message.toOptions().text).toBe('Hello');
    });

    it('should set cc', () => {
      const result = message.cc('cc@example.com');
      expect(result).toBe(message);
      expect(message.toOptions().cc).toBe('cc@example.com');
    });

    it('should set bcc', () => {
      const result = message.bcc('bcc@example.com');
      expect(result).toBe(message);
      expect(message.toOptions().bcc).toBe('bcc@example.com');
    });

    it('should set replyTo', () => {
      const result = message.replyTo('reply@example.com');
      expect(result).toBe(message);
      expect(message.toOptions().replyTo).toBe('reply@example.com');
    });
  });

  describe('attach()', () => {
    it('should initialize attachments array and add attachment', () => {
      const attachment = { filename: 'test.txt', content: 'hello' };
      const result = message.attach(attachment);
      expect(result).toBe(message);
      expect(message.toOptions().attachments).toEqual([attachment]);
    });

    it('should append to existing attachments', () => {
      const a1 = { filename: 'a.txt', content: 'a' };
      const a2 = { filename: 'b.txt', content: 'b' };
      message.attach(a1).attach(a2);
      expect(message.toOptions().attachments).toEqual([a1, a2]);
    });
  });

  describe('header()', () => {
    it('should initialize headers object and add header', () => {
      const result = message.header('X-Custom', 'value');
      expect(result).toBe(message);
      expect(message.toOptions().headers).toEqual({ 'X-Custom': 'value' });
    });

    it('should append to existing headers', () => {
      message.header('X-A', '1').header('X-B', '2');
      expect(message.toOptions().headers).toEqual({ 'X-A': '1', 'X-B': '2' });
    });
  });

  describe('template()', () => {
    it('should set template and data', () => {
      const result = message.template('welcome', { name: 'John' });
      expect(result).toBe(message);
      const opts = message.toOptions();
      expect(opts.template).toBe('welcome');
      expect(opts.data).toEqual({ name: 'John' });
    });
  });

  describe('toOptions()', () => {
    it('should return empty options for new message', () => {
      expect(message.toOptions()).toEqual({});
    });

    it('should return all set options', () => {
      message
        .to('test@test.com')
        .from('sender@test.com')
        .subject('Subject')
        .html('<p>Hi</p>')
        .text('Hi')
        .cc('cc@test.com')
        .bcc('bcc@test.com')
        .replyTo('reply@test.com');

      const opts = message.toOptions();
      expect(opts.to).toBe('test@test.com');
      expect(opts.from).toBe('sender@test.com');
      expect(opts.subject).toBe('Subject');
      expect(opts.html).toBe('<p>Hi</p>');
      expect(opts.text).toBe('Hi');
      expect(opts.cc).toBe('cc@test.com');
      expect(opts.bcc).toBe('bcc@test.com');
      expect(opts.replyTo).toBe('reply@test.com');
    });
  });
});
