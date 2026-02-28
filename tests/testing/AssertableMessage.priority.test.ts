import { AssertableMessage } from '../../src/testing/AssertableMessage';
import type { MailOptions } from '../../src/types';

describe('AssertableMessage priority', () => {
  const makeMessage = (priority?: 'high' | 'normal' | 'low'): AssertableMessage => {
    const options: MailOptions = {
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      ...(priority !== undefined && { priority }),
    };
    return new AssertableMessage(options);
  };

  describe('hasPriority', () => {
    it('should return true when priority matches', () => {
      expect(makeMessage('high').hasPriority('high')).toBe(true);
      expect(makeMessage('normal').hasPriority('normal')).toBe(true);
      expect(makeMessage('low').hasPriority('low')).toBe(true);
    });

    it('should return false when priority does not match', () => {
      expect(makeMessage('high').hasPriority('low')).toBe(false);
      expect(makeMessage('normal').hasPriority('high')).toBe(false);
    });

    it('should return false when no priority is set', () => {
      expect(makeMessage().hasPriority('high')).toBe(false);
    });
  });

  describe('getPriority', () => {
    it('should return the priority level', () => {
      expect(makeMessage('high').getPriority()).toBe('high');
      expect(makeMessage('normal').getPriority()).toBe('normal');
      expect(makeMessage('low').getPriority()).toBe('low');
    });

    it('should return undefined when no priority is set', () => {
      expect(makeMessage().getPriority()).toBeUndefined();
    });
  });
});
