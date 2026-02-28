import { Message } from '../../src/core/Message';

describe('Message - Embedded Images', () => {
  let message: Message;

  beforeEach(() => {
    message = new Message();
  });

  describe('embedImage()', () => {
    it('should add attachment with correct cid and inferred MIME type for png', () => {
      message.embedImage('/path/to/logo.png', 'logo');
      const options = message.toOptions();
      expect(options.attachments).toHaveLength(1);
      expect(options.attachments![0]).toEqual({
        filename: 'logo.png',
        path: '/path/to/logo.png',
        cid: 'logo',
        contentType: 'image/png',
      });
    });

    it('should infer MIME type for jpg', () => {
      message.embedImage('/images/photo.jpg', 'photo');
      expect(message.toOptions().attachments![0].contentType).toBe('image/jpeg');
    });

    it('should infer MIME type for jpeg', () => {
      message.embedImage('/images/photo.jpeg', 'photo');
      expect(message.toOptions().attachments![0].contentType).toBe('image/jpeg');
    });

    it('should infer MIME type for gif', () => {
      message.embedImage('/images/anim.gif', 'anim');
      expect(message.toOptions().attachments![0].contentType).toBe('image/gif');
    });

    it('should infer MIME type for svg', () => {
      message.embedImage('/images/icon.svg', 'icon');
      expect(message.toOptions().attachments![0].contentType).toBe('image/svg+xml');
    });

    it('should infer MIME type for webp', () => {
      message.embedImage('/images/pic.webp', 'pic');
      expect(message.toOptions().attachments![0].contentType).toBe('image/webp');
    });

    it('should fallback to application/octet-stream for unknown extensions', () => {
      message.embedImage('/files/data.xyz', 'data');
      expect(message.toOptions().attachments![0].contentType).toBe('application/octet-stream');
    });

    it('should use provided filename instead of basename', () => {
      message.embedImage('/path/to/logo.png', 'logo', 'company-logo.png');
      expect(message.toOptions().attachments![0].filename).toBe('company-logo.png');
    });

    it('should default filename to basename of file path', () => {
      message.embedImage('/assets/images/banner.jpg', 'banner');
      expect(message.toOptions().attachments![0].filename).toBe('banner.jpg');
    });

    it('should return this for chaining', () => {
      const result = message.embedImage('/path/to/logo.png', 'logo');
      expect(result).toBe(message);
    });
  });

  describe('embedImageData()', () => {
    it('should add attachment with buffer content and correct CID', () => {
      const buffer = Buffer.from('fake-image-data');
      message.embedImageData(buffer, 'banner', 'image/jpeg');
      const options = message.toOptions();
      expect(options.attachments).toHaveLength(1);
      expect(options.attachments![0]).toEqual({
        filename: 'banner.jpeg',
        content: buffer,
        cid: 'banner',
        contentType: 'image/jpeg',
      });
    });

    it('should add attachment with string content', () => {
      message.embedImageData('<svg></svg>', 'icon', 'image/svg+xml');
      const attachment = message.toOptions().attachments![0];
      expect(attachment.content).toBe('<svg></svg>');
      expect(attachment.cid).toBe('icon');
      expect(attachment.contentType).toBe('image/svg+xml');
    });

    it('should use provided filename', () => {
      const buffer = Buffer.from('data');
      message.embedImageData(buffer, 'logo', 'image/png', 'my-logo.png');
      expect(message.toOptions().attachments![0].filename).toBe('my-logo.png');
    });

    it('should generate default filename from cid and content type', () => {
      const buffer = Buffer.from('data');
      message.embedImageData(buffer, 'header', 'image/png');
      expect(message.toOptions().attachments![0].filename).toBe('header.png');
    });

    it('should return this for chaining', () => {
      const result = message.embedImageData(Buffer.from('data'), 'img', 'image/png');
      expect(result).toBe(message);
    });
  });

  describe('multiple embeds', () => {
    it('should support multiple embedded images', () => {
      message
        .embedImage('/path/to/logo.png', 'logo')
        .embedImageData(Buffer.from('data'), 'banner', 'image/jpeg')
        .embedImage('/path/to/footer.gif', 'footer');

      const attachments = message.toOptions().attachments!;
      expect(attachments).toHaveLength(3);
      expect(attachments[0].cid).toBe('logo');
      expect(attachments[1].cid).toBe('banner');
      expect(attachments[2].cid).toBe('footer');
    });

    it('should coexist with regular attachments', () => {
      message
        .attach({ filename: 'doc.pdf', path: '/files/doc.pdf' })
        .embedImage('/path/to/logo.png', 'logo');

      const attachments = message.toOptions().attachments!;
      expect(attachments).toHaveLength(2);
      expect(attachments[0].cid).toBeUndefined();
      expect(attachments[1].cid).toBe('logo');
    });
  });
});
