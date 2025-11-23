# Contributing to nodemail

First off, thank you for considering contributing to nodemail! 🎉

## 🚧 Project Status

nodemail is in early development (Phase 1 complete, Phase 2 in progress). We welcome contributions of all kinds!

## 🤝 How to Contribute

### Reporting Bugs

- Use the [GitHub Issues](https://github.com/impruthvi/nodemail/issues) page
- Check if the issue already exists
- Include as much detail as possible:
  - Node.js version
  - npm version
  - Steps to reproduce
  - Expected vs actual behavior

### Suggesting Features

- Open a [GitHub Discussion](https://github.com/impruthvi/nodemail/discussions)
- Explain the use case
- Provide examples if possible

### Pull Requests

1. **Fork the repository**
2. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, readable code
   - Follow the existing code style
   - Add comments where needed

4. **Test your changes**
   ```bash
   npm run build
   npm run lint
   npm test  # when tests are implemented
   ```

5. **Commit your changes**
   ```bash
   git commit -m "Add: brief description of your changes"
   ```
   
   Use clear commit messages:
   - `Add: new feature`
   - `Fix: bug description`
   - `Update: improvement description`
   - `Docs: documentation changes`

6. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 💻 Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/nodemail.git
cd nodemail

# Install dependencies
npm install

# Build
npm run build

# Lint
npm run lint

# Format
npm run format
```

## 📝 Code Style

- We use **TypeScript 5.6** with strict mode
- **ESLint 9** for linting (flat config)
- **Prettier** for code formatting
- Run `npm run lint` and `npm run format` before committing

## 🎯 Areas Where We Need Help

- [ ] Implementing email provider adapters
- [ ] Writing tests
- [ ] Documentation
- [ ] Examples and tutorials
- [ ] CLI tool development
- [ ] Queue integration
- [ ] Template engine support

## 📖 Project Structure

```
nodemail/
├── src/
│   ├── core/          # Core functionality
│   ├── providers/     # Email provider implementations
│   ├── types/         # TypeScript definitions
│   └── ...
├── tests/             # Test files
├── docs/              # Documentation
└── examples/          # Usage examples
```

## ❓ Questions?

- Open a [GitHub Discussion](https://github.com/impruthvi/nodemail/discussions)
- Comment on existing issues

## 📜 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow

## 🙏 Thank You!

Every contribution, no matter how small, is valuable. Thank you for helping make nodemail better!
