import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { z } from 'zod';

import { googleCredentialsSchema, googleTokenSchema } from './gmailSchema';
import env from '../env';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me/';
const TOKEN_MARGIN_MS = 60_000;
const NOT_FOUND = 404;

const tokens = new Map<string, { value: string; expiresAt: number }>();

interface FetchGmailOptions<Schema extends z.ZodType> {
  account: string;
  path: string;
  schema: Schema;
}

/**
 * Calls the Gmail REST API for one account and validates the answer. It reads
 * the OAuth file of the `google` MCP in `GOOGLE_CREDENTIALS_DIR` and never
 * writes it. It gets an access token with the refresh token and keeps that
 * token in memory until one minute before it ends. An error never holds a
 * token.
 *
 * @param options - The account, the API path after `users/me/`, and the schema
 *   of the answer.
 * @returns The validated answer, or `undefined` when Gmail answers 404.
 */
const fetchGmail = async <Schema extends z.ZodType>({
  account,
  path,
  schema
}: FetchGmailOptions<Schema>) => {
  let token = tokens.get(account);

  if (!token || token.expiresAt <= Date.now()) {
    const credentials = googleCredentialsSchema.parse(
      JSON.parse(
        await readFile(
          join(env.GOOGLE_CREDENTIALS_DIR, `${account}.json`),
          'utf8'
        )
      )
    );
    const response = await fetch(credentials.token_uri, {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credentials.refresh_token,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret
      })
    });

    if (!response.ok) {
      throw new Error(
        `Google token refresh for ${account} gave ${response.status}`
      );
    }

    const answer = googleTokenSchema.parse(await response.json());

    token = {
      value: answer.access_token,
      expiresAt: Date.now() + answer.expires_in * 1000 - TOKEN_MARGIN_MS
    };
    tokens.set(account, token);
  }

  const response = await fetch(`${GMAIL_API}${path}`, {
    headers: { authorization: `Bearer ${token.value}` }
  });

  if (response.status === NOT_FOUND) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error(
      `Gmail ${path.split('?')[0]} for ${account} gave ${response.status}`
    );
  }

  return schema.parse(await response.json());
};

export default fetchGmail;
