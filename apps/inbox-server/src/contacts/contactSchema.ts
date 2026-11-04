import { z } from 'zod';

const trimmed = z.string().trim().min(1);

export const identitySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('whatsapp'),
    value: trimmed.regex(/^(personal|business):.+$/)
  }),
  z.object({
    kind: z.literal('phone'),
    value: z
      .string()
      .transform((value) => value.replace(/[\s()-]/g, ''))
      .pipe(z.string().regex(/^\+\d{6,15}$/))
  }),
  z.object({
    kind: z.literal('email'),
    value: trimmed.toLowerCase().pipe(z.email())
  }),
  z.object({
    kind: z.literal('github'),
    value: trimmed.toLowerCase().regex(/^[a-z0-9-]+$/)
  })
]);

export type Identity = z.infer<typeof identitySchema>;

export const contactSchema = z.object({
  id: z.string().regex(/^contact:[0-9a-f-]{36}$/),
  name: z.string().trim().min(1).max(200),
  identities: z.array(identitySchema)
});

export type Contact = z.infer<typeof contactSchema>;

export const contactsFileSchema = z.object({
  v: z.literal(1),
  contacts: z.array(contactSchema)
});
