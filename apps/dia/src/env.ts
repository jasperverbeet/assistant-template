import { homedir } from 'node:os';
import { join } from 'node:path';

import { BROKER_FILE_PATH } from '@assistant/cdp-client/readBrokerFile';
import { z } from 'zod';

const envSchema = z.object({
  DIA_USER_DATA_DIR: z
    .string()
    .default(join(homedir(), 'Library/Application Support/Dia/User Data')),
  DIA_BROKER_FILE: z.string().default(BROKER_FILE_PATH)
});

const env = envSchema.parse(process.env);

export default env;
