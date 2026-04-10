export type ApiError = {
  code?: string;
  message: string;
  requestId?: string;
};

export type ApiHealth = {
  status: "degraded" | "down" | "ok";
  timestamp: string;
  uptimeSeconds: number;
};
