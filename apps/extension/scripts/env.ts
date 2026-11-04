import { z } from 'zod';

const env = z
  .object({
    INBOX_TOKEN: z.string().min(32),
    INBOX_PORT: z.string().regex(/^\d+$/).default('4319')
  })
  .parse(process.env);

export default env;
