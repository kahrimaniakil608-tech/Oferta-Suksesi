import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from "@nestjs/common";
export function boundedInteger(
  value: unknown,
  fallback: number,
  max = 100,
): number {
  if (value === undefined || value === "") return fallback;
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    !/^\d+$/.test(String(value))
  )
    throw new BadRequestException("Expected a positive integer");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > max)
    throw new BadRequestException(`Expected an integer between 1 and ${max}`);
  return number;
}
@Injectable()
export class QueryBoundsPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type !== "query") return value;
    const values = metadata.data ? { [metadata.data]: value } : value;
    if (values && typeof values === "object")
      for (const [key, item] of Object.entries(values)) {
        if (Array.isArray(item) || (item !== null && typeof item === "object"))
          throw new BadRequestException(
            `Repeated or nested query parameter: ${key}`,
          );
        if (
          item !== undefined &&
          item !== "" &&
          ["page", "limit", "categoryId", "cityId", "subcategoryId"].includes(
            key,
          )
        )
          boundedInteger(item, 1, key === "limit" ? 5000 : 1000000);
      }
    return value;
  }
}
