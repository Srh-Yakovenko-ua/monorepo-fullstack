import { RevokedRefreshTokenModel } from "../models/revoked-refresh-token.model.js";

const MONGO_DUPLICATE_KEY_CODE = 11000;

export async function clearAll(): Promise<void> {
  await RevokedRefreshTokenModel.deleteMany({});
}

export async function revokeOnce({
  expiresAt,
  jti,
}: {
  expiresAt: Date;
  jti: string;
}): Promise<boolean> {
  try {
    await RevokedRefreshTokenModel.create({ expiresAt, jti });
    return true;
  } catch (err) {
    if (isDuplicateKeyError(err)) return false;
    throw err;
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === MONGO_DUPLICATE_KEY_CODE
  );
}
