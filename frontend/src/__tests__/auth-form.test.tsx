import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Login validation schema targeted in tests
const loginSchema = z.object({
  email: z.string().email({ message: 'A valid email address is required.' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long.' })
    .regex(/[A-Z]/, { message: 'Must contain at least one uppercase letter.' })
    .regex(/[a-z]/, { message: 'Must contain at least one lowercase letter.' })
    .regex(/[0-9]/, { message: 'Must contain at least one number.' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Must contain at least one special character.' }),
});

describe('Task Platform Auth Form Validation Schema', () => {
  it('passes on strict and compliant passwords', () => {
    const result = loginSchema.safeParse({
      email: 'member@task.com',
      password: 'MemberPass123!',
    });
    expect(result.success).toBe(true);
  });

  it('fails validation when email is poorly formatted', () => {
    const result = loginSchema.safeParse({
      email: 'bad-email',
      password: 'MemberPass123!',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('valid email address');
    }
  });

  it('fails validation when password lacks symbols', () => {
    const result = loginSchema.safeParse({
      email: 'member@task.com',
      password: 'MemberPass1234',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('at least one special character');
    }
  });

  it('fails validation when password is too short', () => {
    const result = loginSchema.safeParse({
      email: 'member@task.com',
      password: 'Short1!',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('at least 8 characters');
    }
  });
});
