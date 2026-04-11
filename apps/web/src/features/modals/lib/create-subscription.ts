import { createLogger } from "@/lib/logger";

const logger = createLogger("modal-subscription");

export type Subscription<T> = {
  emit: (payload: T) => void;
  subscribe: (handler: (payload: T) => void) => () => void;
  unsubscribe: (handler: (payload: T) => void) => void;
};

export function createSubscription<T>(): Subscription<T> {
  const handlers: Set<(payload: T) => void> = new Set();

  const subscribe: Subscription<T>["subscribe"] = (handler) => {
    handlers.add(handler);
    return () => handlers.delete(handler);
  };

  const unsubscribe: Subscription<T>["unsubscribe"] = (handler) => {
    handlers.delete(handler);
  };

  const emit: Subscription<T>["emit"] = (payload) => {
    const snapshot = new Set(handlers);
    snapshot.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        logger.warn("handler threw", error);
      }
    });
  };

  return { emit, subscribe, unsubscribe };
}
