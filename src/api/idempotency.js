export function newIdempotencyKey() {
  return crypto.randomUUID();
}

export function idempotencyConfig(key) {
  return { headers: { "Idempotency-Key": key } };
}
