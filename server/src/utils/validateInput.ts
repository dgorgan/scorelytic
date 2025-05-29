// TODO: Implement input validation utilities

type ValidationInput = {
  [key: string]: any;
};

export function validateInput(input: ValidationInput): boolean {
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) {
      return false;
    }

    switch (key) {
      case 'text':
        if (typeof value !== 'string' || value.trim().length === 0) {
          return false;
        }
        break;

      case 'sentimentScore':
        if (typeof value !== 'number' || value < -1 || value > 1) {
          return false;
        }
        break;

      case 'biasIndicators':
        if (!Array.isArray(value) || value.length === 0) {
          return false;
        }
        if (!value.every((item) => typeof item === 'string')) {
          return false;
        }
        break;

      case 'reviewId':
        if (typeof value !== 'string' || !value.match(/^[a-zA-Z0-9-_]+$/)) {
          return false;
        }
        break;
    }
  }

  return true;
}
