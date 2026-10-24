import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { Prisma } from "@prisma/client";
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
)
export class PrismaErrorsFilter implements ExceptionFilter {
  catch(
    error:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientUnknownRequestError,
    host: ArgumentsHost,
  ) {
    const code = "code" in error ? error.code : "";
    const constraint =
      /23514/.test(error.message) ||
      code === "P2004" ||
      (code === "P2010" && ("meta" in error && error.meta?.code) === "23514");
    const status =
      code === "P2025"
        ? 404
        : ["P2002", "P2034"].includes(code) || constraint
          ? 409
          : code === "P2003"
            ? 400
            : 503;
    const message = constraint
      ? "The requested change exceeds a configured limit or is missing required data. Check images, listing limits and booking dates."
      : status === 404
        ? "Record not found"
        : status === 409
          ? "This record changed or already exists. Reload and try again."
          : status === 400
            ? "This record is still referenced by other records."
            : "The database is temporarily unavailable. Please retry.";
    host
      .switchToHttp()
      .getResponse()
      .status(status)
      .json({ statusCode: status, message });
  }
}
