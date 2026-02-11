/**
 * Default email CSS theme for Markdown Mail
 * Responsive, professional styling for email clients
 */

export interface MarkdownTheme {
  css: string;
  headerHtml?: string;
  footerHtml?: string;
}

export function getDefaultTheme(): MarkdownTheme {
  return {
    css: `
/* Base Styles */
body {
  margin: 0;
  padding: 0;
  width: 100%;
  background-color: #f4f4f7;
  -webkit-text-size-adjust: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.email-wrapper {
  width: 100%;
  margin: 0;
  padding: 0;
  background-color: #f4f4f7;
}

.email-content {
  width: 100%;
  max-width: 570px;
  margin: 0 auto;
}

/* Header */
.email-header {
  padding: 25px 0;
  text-align: center;
}

/* Body */
.email-body {
  width: 100%;
  margin: 0;
  padding: 0;
  background-color: #ffffff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.email-body-inner {
  width: 570px;
  max-width: 570px;
  margin: 0 auto;
  padding: 32px;
}

/* Footer */
.email-footer {
  width: 570px;
  max-width: 570px;
  margin: 0 auto;
  padding: 32px;
  text-align: center;
}

.email-footer p {
  color: #aeaeae;
  font-size: 12px;
  line-height: 1.5;
}

/* Typography */
h1 {
  margin-top: 0;
  color: #333333;
  font-size: 22px;
  font-weight: bold;
  line-height: 1.4;
}

h2 {
  margin-top: 0;
  color: #333333;
  font-size: 18px;
  font-weight: bold;
  line-height: 1.4;
}

h3 {
  margin-top: 0;
  color: #333333;
  font-size: 16px;
  font-weight: bold;
  line-height: 1.4;
}

p {
  margin-top: 0;
  color: #51545e;
  font-size: 16px;
  line-height: 1.625;
}

a {
  color: #3869d4;
  text-decoration: underline;
}

/* Lists */
ul, ol {
  margin-top: 0;
  color: #51545e;
  font-size: 16px;
  line-height: 1.625;
}

/* Code */
code {
  background-color: #e8e8eb;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 14px;
  color: #333333;
}

pre {
  background-color: #333333;
  color: #e8e8eb;
  border-radius: 4px;
  padding: 16px;
  overflow-x: auto;
  font-size: 14px;
  line-height: 1.5;
}

pre code {
  background-color: transparent;
  padding: 0;
  color: inherit;
}

/* Blockquote */
blockquote {
  margin: 0 0 16px;
  padding: 0 0 0 16px;
  border-left: 4px solid #e8e8eb;
  color: #6e6e73;
  font-style: italic;
}

/* Horizontal Rule */
hr {
  border: none;
  border-top: 1px solid #e8e8eb;
  margin: 24px 0;
}

/* Images */
img {
  max-width: 100%;
  height: auto;
}

/* Button Component */
.button {
  display: inline-block;
  width: auto;
  padding: 12px 36px;
  border-radius: 4px;
  font-size: 16px;
  font-weight: bold;
  text-align: center;
  text-decoration: none;
  -webkit-text-size-adjust: none;
  mso-hide: all;
}

.button-primary {
  background-color: #3869d4;
  color: #ffffff;
}

.button-success {
  background-color: #22bc66;
  color: #ffffff;
}

.button-error {
  background-color: #ff6136;
  color: #ffffff;
}

/* Panel Component */
.panel {
  margin: 16px 0;
  padding: 16px;
  background-color: #f4f4f7;
  border-left: 4px solid #3869d4;
  border-radius: 0 4px 4px 0;
}

.panel p {
  color: #51545e;
  font-size: 14px;
  line-height: 1.625;
}

.panel p:last-child {
  margin-bottom: 0;
}

/* Table Component */
.table-wrapper {
  margin: 16px 0;
  width: 100%;
  overflow-x: auto;
}

.table-wrapper table {
  width: 100%;
  border-collapse: collapse;
}

.table-wrapper th {
  padding: 10px 12px;
  background-color: #f4f4f7;
  border-bottom: 2px solid #e8e8eb;
  text-align: left;
  font-size: 14px;
  font-weight: bold;
  color: #333333;
}

.table-wrapper td {
  padding: 10px 12px;
  border-bottom: 1px solid #e8e8eb;
  font-size: 14px;
  color: #51545e;
}

/* Responsive */
@media only screen and (max-width: 600px) {
  .email-body-inner,
  .email-footer {
    width: 100% !important;
    padding: 16px !important;
  }
}
`,
  };
}
