import { AssertableMessage } from '../../src/testing/AssertableMessage';
import type { MailOptions } from '../../src/types';

describe('AssertableMessage - Embedded Images', () => {
  const baseOptions: MailOptions = {
    to: 'user@example.com',
    subject: 'Test',
    html: '<img src="cid:logo" />',
  };

  describe('hasEmbeddedImage()', () => {
    it('should return true when an attachment with matching CID exists', () => {
      const msg = new AssertableMessage({
        ...baseOptions,
        attachments: [
          { filename: 'logo.png', path: '/path/to/logo.png', cid: 'logo', contentType: 'image/png' },
        ],
      });
      expect(msg.hasEmbeddedImage('logo')).toBe(true);
    });

    it('should return false when no attachment has the given CID', () => {
      const msg = new AssertableMessage({
        ...baseOptions,
        attachments: [
          { filename: 'logo.png', path: '/path/to/logo.png', cid: 'logo', contentType: 'image/png' },
        ],
      });
      expect(msg.hasEmbeddedImage('banner')).toBe(false);
    });

    it('should return false when there are no attachments', () => {
      const msg = new AssertableMessage(baseOptions);
      expect(msg.hasEmbeddedImage('logo')).toBe(false);
    });

    it('should return false when attachments exist but none have CID', () => {
      const msg = new AssertableMessage({
        ...baseOptions,
        attachments: [
          { filename: 'doc.pdf', path: '/files/doc.pdf' },
        ],
      });
      expect(msg.hasEmbeddedImage('doc.pdf')).toBe(false);
    });
  });

  describe('getEmbeddedImages()', () => {
    it('should return only attachments with a CID', () => {
      const msg = new AssertableMessage({
        ...baseOptions,
        attachments: [
          { filename: 'doc.pdf', path: '/files/doc.pdf' },
          { filename: 'logo.png', path: '/path/to/logo.png', cid: 'logo', contentType: 'image/png' },
          { filename: 'banner.jpg', content: Buffer.from('data'), cid: 'banner', contentType: 'image/jpeg' },
        ],
      });
      const embedded = msg.getEmbeddedImages();
      expect(embedded).toHaveLength(2);
      expect(embedded[0].cid).toBe('logo');
      expect(embedded[1].cid).toBe('banner');
    });

    it('should return empty array when no attachments', () => {
      const msg = new AssertableMessage(baseOptions);
      expect(msg.getEmbeddedImages()).toEqual([]);
    });

    it('should return empty array when no attachments have CID', () => {
      const msg = new AssertableMessage({
        ...baseOptions,
        attachments: [
          { filename: 'doc.pdf', path: '/files/doc.pdf' },
        ],
      });
      expect(msg.getEmbeddedImages()).toEqual([]);
    });
  });

  describe('embeddedImageCount()', () => {
    it('should return the correct count of embedded images', () => {
      const msg = new AssertableMessage({
        ...baseOptions,
        attachments: [
          { filename: 'doc.pdf', path: '/files/doc.pdf' },
          { filename: 'logo.png', path: '/path/to/logo.png', cid: 'logo', contentType: 'image/png' },
          { filename: 'banner.jpg', content: Buffer.from('data'), cid: 'banner', contentType: 'image/jpeg' },
        ],
      });
      expect(msg.embeddedImageCount()).toBe(2);
    });

    it('should return 0 when no attachments', () => {
      const msg = new AssertableMessage(baseOptions);
      expect(msg.embeddedImageCount()).toBe(0);
    });

    it('should return 0 when no embedded images', () => {
      const msg = new AssertableMessage({
        ...baseOptions,
        attachments: [
          { filename: 'doc.pdf', path: '/files/doc.pdf' },
        ],
      });
      expect(msg.embeddedImageCount()).toBe(0);
    });
  });
});
