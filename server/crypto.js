import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getDataDir } from './paths.js';

/**
 * Secret storage. Inside Electron the master key is protected with
 * safeStorage (Keychain on macOS, DPAPI on Windows) via setKeyProtector().
 * Headless mode keeps the key in a 0600 file — good enough for dev, and the
 * README documents that the packaged app is the recommended way to run FOCUS.
 */
let protector = null; // { encrypt(buf)->buf, decrypt(buf)->buf }

export function setKeyProtector(p) {
  protector = p;
}

function keyFile() {
  return path.join(getDataDir(), protector ? 'master.key.enc' : 'master.key');
}

let cachedKey = null;

function getMasterKey() {
  if (cachedKey) return cachedKey;
  const file = keyFile();
  if (fs.existsSync(file)) {
    const raw = fs.readFileSync(file);
    cachedKey = protector ? protector.decrypt(raw) : raw;
  } else {
    cachedKey = crypto.randomBytes(32);
    const raw = protector ? protector.encrypt(cachedKey) : cachedKey;
    fs.writeFileSync(file, raw, { mode: 0o600 });
  }
  return cachedKey;
}

export function encryptSecret(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getMasterKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSecret(b64) {
  const buf = Buffer.from(b64, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getMasterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
