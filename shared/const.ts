export const COOKIE_NAME = "app_session_id";
export const VISITOR_COOKIE_NAME = "nexus_visitor_id";
// Session lifetime: 7 days. Balances security (shorter window if token stolen)
// with convenience. Increase only with refresh-token rotation in place.
export const SESSION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
/** @deprecated Use SESSION_LIFETIME_MS. ONE_YEAR_MS kept for any legacy callers. */
export const ONE_YEAR_MS = SESSION_LIFETIME_MS;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = "Please login (10001)";
export const NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
