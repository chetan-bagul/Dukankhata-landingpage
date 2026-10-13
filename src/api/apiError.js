/**
 * DukanKhata™ Central API Error Sanitizer & Handler
 * Translates raw backend errors, validation payloads, and network failures
 * into friendly, non-technical messages suitable for store owners while
 * omitting SQL traces, database paths, and secrets.
 */

const SENSITIVE_PATTERNS = [
  /sql/i,
  /syntax error/i,
  /exception/i,
  /stack trace/i,
  /org\.springframework/i,
  /java\.lang/i,
  /hibernat/i,
  /postgres/i,
  /duplicate key/i,
  /foreign key/i,
  /nullpointer/i,
  /jwt/i,
  /bearer/i,
  /secret/i,
];

function sanitizeMessage(msg, fallback) {
  if (!msg || typeof msg !== "string") return fallback;
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(msg)) {
      return fallback;
    }
  }
  return msg;
}

export function getApiErrorDetails(error, fallback = "Unable to complete request. Please try again.") {
  if (!error) {
    return { message: fallback, code: "UNKNOWN", correlationId: null, errors: null, status: null };
  }

  // Network offline / timeout
  if (error.code === "ERR_NETWORK" || !error.response) {
    return {
      message: "No internet connection or server unreachable. Please check your network.",
      code: "OFFLINE_NETWORK_ERROR",
      correlationId: null,
      errors: null,
      status: 0,
    };
  }

  const status = error.response?.status;
  const body = error.response?.data;

  // Session expired / Unauthorized
  if (status === 401) {
    return {
      message: "Your session has expired. Please log in again.",
      code: "SESSION_EXPIRED",
      correlationId: body?.correlationId || error.response.headers?.["x-correlation-id"] || null,
      errors: null,
      status: 401,
    };
  }

  // Access Denied / Forbidden
  if (status === 403) {
    return {
      message: "Access restricted. You do not have permission to perform this action.",
      code: "ACCESS_DENIED",
      correlationId: body?.correlationId || error.response.headers?.["x-correlation-id"] || null,
      errors: null,
      status: 403,
    };
  }

  // Validation errors
  if (body?.errors && typeof body.errors === "object") {
    const firstKey = Object.keys(body.errors)[0];
    const firstVal = body.errors[firstKey];
    if (firstVal) {
      return {
        message: sanitizeMessage(firstVal, fallback),
        code: body.code || "VALIDATION_ERROR",
        correlationId: body.correlationId || error.response.headers?.["x-correlation-id"] || null,
        errors: body.errors,
        status: status || 400,
      };
    }
  }

  // General server error message
  const rawMsg = body?.message || error.message || fallback;
  return {
    message: sanitizeMessage(rawMsg, fallback),
    code: body?.code || (status >= 500 ? "SERVER_ERROR" : "API_ERROR"),
    correlationId: body?.correlationId || error.response.headers?.["x-correlation-id"] || null,
    errors: body?.errors || null,
    status: status || 500,
  };
}

export function getApiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  return getApiErrorDetails(error, fallback).message;
}
