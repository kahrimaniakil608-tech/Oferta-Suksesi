import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { createHmac, timingSafeEqual } from "crypto";
@Injectable()
export class RequestThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const value = request.headers["x-internal-render"];
    if (
      request.method === "GET" &&
      typeof value === "string" &&
      process.env.JWT_SECRET
    ) {
      const expected = Buffer.from(
        createHmac("sha256", process.env.JWT_SECRET)
          .update("oferta:ssr:v1")
          .digest("hex"),
      );
      const received = Buffer.from(value);
      if (
        received.length === expected.length &&
        timingSafeEqual(received, expected)
      )
        return true;
    }
    return super.shouldSkip(context);
  }
}
