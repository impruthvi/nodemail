import { Message } from '../../src/core/Message';

describe('Message priority', () => {
  it('should set high priority', () => {
    const msg = new Message();
    msg.priority('high');
    expect(msg.toOptions().priority).toBe('high');
  });

  it('should set normal priority', () => {
    const msg = new Message();
    msg.priority('normal');
    expect(msg.toOptions().priority).toBe('normal');
  });

  it('should set low priority', () => {
    const msg = new Message();
    msg.priority('low');
    expect(msg.toOptions().priority).toBe('low');
  });

  it('should return this for chaining', () => {
    const msg = new Message();
    const result = msg.priority('high');
    expect(result).toBe(msg);
  });

  it('should work in fluent chain with other methods', () => {
    const msg = new Message();
    const options = msg
      .to('user@example.com')
      .subject('Test')
      .priority('high')
      .html('<p>Hello</p>')
      .toOptions();

    expect(options.to).toBe('user@example.com');
    expect(options.subject).toBe('Test');
    expect(options.priority).toBe('high');
    expect(options.html).toBe('<p>Hello</p>');
  });

  it('should allow priority to be changed', () => {
    const msg = new Message();
    msg.priority('high');
    expect(msg.toOptions().priority).toBe('high');

    msg.priority('low');
    expect(msg.toOptions().priority).toBe('low');
  });
});
