import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(private readonly db: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const path = context
      .switchToHttp()
      .getRequest()
      .path.replace(/^\/api\/v1/, "");
    if (
      /^\/(admin(?:\/|$)|auth(?:\/|$)|health$|ready$|site-config$|users\/me$|media\/(?:consume-upload-permit|register-files)$)/.test(
        path,
      )
    )
      return true;
    if (
      (
        await this.db.siteSetting.findUnique({
          where: { key: "maintenance_mode" },
        })
      )?.value !== "true"
    )
      return true;
    const message = (
      await this.db.siteSetting.findUnique({
        where: { key: "maintenance_message" },
      })
    )?.value;
    throw new ServiceUnavailableException(
      message || "Mirëmbajtje. Provoni përsëri më vonë.",
    );
  }
}
