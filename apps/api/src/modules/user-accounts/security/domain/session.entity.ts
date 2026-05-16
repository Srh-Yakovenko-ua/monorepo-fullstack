export interface SessionDoc {
  deviceId: string;
  expiresAt: Date;
  id: number;
  ip: string;
  lastActiveAt: Date;
  title: string;
  tokenJti: string;
  userId: number;
}
