// Kirish: faqat parolni biladigan (rahbar va administrator) tizimni ko'radi.
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';

const COOKIE = 'klinika_sessiya';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const digest = (s) => createHash('sha256').update(String(s)).digest();

export function safeEqual(a, b) {
  return timingSafeEqual(digest(a), digest(b));
}

export class Auth {
  constructor(password) {
    this.password = password;
    this.sessions = new Map();
  }

  login(password) {
    if (!safeEqual(password ?? '', this.password)) return null;
    const token = randomBytes(24).toString('base64url');
    this.sessions.set(token, Date.now() + SESSION_TTL_MS);
    return token;
  }

  logout(req) {
    const token = readCookie(req, COOKIE);
    if (token) this.sessions.delete(token);
  }

  check(req) {
    const token = readCookie(req, COOKIE);
    if (!token) return false;
    const exp = this.sessions.get(token);
    if (!exp || exp < Date.now()) {
      this.sessions.delete(token);
      return false;
    }
    return true;
  }

  cookie(token, secure) {
    return `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${secure ? '; Secure' : ''}`;
  }

  clearCookie() {
    return `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
  }
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}
