declare module "cookie" {
  export function parse(
    str: string,
    options?: Record<string, unknown>
  ): Record<string, string>;
}

declare global {
  namespace Express {
    interface Request {
      cookies: Record<string, string>;
    }
  }
}
