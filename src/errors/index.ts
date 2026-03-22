export class NodeMailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NodeMailError';
  }
}

export class ConfigurationError extends NodeMailError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class ValidationError extends NodeMailError {
  public field?: string | undefined;
  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class ProviderError extends NodeMailError {
  public provider: string;
  constructor(message: string, provider: string) {
    super(message);
    this.name = 'ProviderError';
    this.provider = provider;
  }
}

export class AllProvidersFailedError extends NodeMailError {
  public attempts: Array<{ provider: string; error: string }>;
  constructor(attempts: Array<{ provider: string; error: string }>) {
    const msg = `All providers failed: ${attempts.map(a => `${a.provider}: ${a.error}`).join(', ')}`;
    super(msg);
    this.name = 'AllProvidersFailedError';
    this.attempts = attempts;
  }
}
