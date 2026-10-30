import { get, put } from '@vercel/blob';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

// accounts/<email>.json → { name, salt, hash } (scrypt, 64-byte key)

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const EMAIL_RE = /^[^\s@/]{1,64}@[^\s@/]{1,190}\.[a-z]{2,}$/;
export const MIN_PASSWORD = 6;

interface AccountRecord {
  name: string;
  salt: string;
  hash: string;
  createdAt: string;
}

const path = (email: string) => `accounts/${email}.json`;

export const normalizeEmail = (e: string) => e.trim().toLowerCase();

export const readJsonBlob = async <T>(pathname: string): Promise<T | null> => {
  const blob = await get(pathname, { access: 'private', useCache: false });
  return blob ? (JSON.parse(await new Response(blob.stream).text()) as T) : null;
};

export const writeJsonBlob = (pathname: string, body: string, overwrite: boolean) =>
  put(pathname, body, {
    access: 'private',
    allowOverwrite: overwrite,
    addRandomSuffix: false,
    contentType: 'application/json',
  });

export const createAccount = async (email: string, name: string, password: string) => {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  const record: AccountRecord = {
    name,
    salt: salt.toString('base64'),
    hash: hash.toString('base64'),
    createdAt: new Date().toISOString(),
  };
  // allowOverwrite: false → a second sign-up for the same email fails instead of replacing it
  await writeJsonBlob(path(email), JSON.stringify(record), false);
};

export const accountExists = async (email: string) => (await readJsonBlob<AccountRecord>(path(email))) !== null;

export const checkPassword = async (email: string, password: string): Promise<{ name: string } | null> => {
  const rec = await readJsonBlob<AccountRecord>(path(email));
  if (!rec) return null;
  const expected = Buffer.from(rec.hash, 'base64');
  const actual = await scryptAsync(password, Buffer.from(rec.salt, 'base64'), expected.length);
  return timingSafeEqual(expected, actual) ? { name: rec.name } : null;
};
