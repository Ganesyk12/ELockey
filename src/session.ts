export interface Session {
  userId: string;
  username: string;
  masterKey?: string;
}

const sessions = new Map<string, Session>();

export function createSession(
  token: string,
  data: Omit<Session, "masterKey">
): void {
  sessions.set(token, { ...data });
}

export function destroySession(token: string | undefined): void {
  if (token) sessions.delete(token);
}

export function getSession(token: string | undefined): Session | undefined {
  if (!token) return undefined;
  return sessions.get(token);
}

export function setMasterKey(token: string, masterKey: string): void {
  const s = sessions.get(token);
  if (s) s.masterKey = masterKey;
}

export function unsetMasterKey(token: string | undefined): void {
  if (!token) return;
  const s = sessions.get(token);
  if (s) delete s.masterKey;
}

export function hasSession(token: string | undefined): boolean {
  return !!token && sessions.has(token);
}
