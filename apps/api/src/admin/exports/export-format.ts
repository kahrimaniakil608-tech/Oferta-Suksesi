import { Readable } from "stream";
import { BadRequestException, StreamableFile } from "@nestjs/common";
import { Prisma } from "@prisma/client";
const { Parser } = require("json2csv");

/** A visible text marker survives CSV save/reopen, unlike quote-only escaping. */
export function spreadsheetText(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const leading = value
    .normalize("NFKC")
    // eslint-disable-next-line no-control-regex -- formula detection must include invisible control characters
    .replace(/^[\s\p{Cf}\u0000-\u001f\u007f]+/u, "");
  // eslint-disable-next-line no-control-regex -- preserve unsafe cells as explicit text
  return /^[=+\-@]/.test(leading) || /^[\u0000-\u001f\u007f]/.test(value)
    ? `[text] ${value}`
    : value;
}

export function csvFile(
  fields: string[],
  rows: Record<string, unknown>[],
): StreamableFile {
  const safeRows = rows.map((row) =>
    Object.fromEntries(
      fields.map((field) => [field, spreadsheetText(row[field])]),
    ),
  );
  const csv = new Parser({ fields }).parse(safeRows);
  return new StreamableFile(Buffer.from("\uFEFF" + csv, "utf8"));
}

/** Export date inputs are inclusive UTC calendar days; the upper SQL bound is exclusive. */
export function exportDateRange(filters: {
  dateFrom?: string;
  dateTo?: string;
}) {
  const parse = (value: string) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException(
        "Export dates must be valid YYYY-MM-DD calendar dates",
      );
    }
    return date;
  };
  const from = filters.dateFrom ? parse(filters.dateFrom) : undefined;
  const to = filters.dateTo ? parse(filters.dateTo) : undefined;
  if (from && to && from > to)
    throw new BadRequestException("Start date must not follow end date");
  return {
    ...(from && { gte: from }),
    ...(to && { lt: new Date(to.getTime() + 86400000) }),
  };
}

export const MAX_EXPORT_ROWS = 10000;
export function requireCompleteExport<T>(rows: T[]): T[] {
  if (rows.length > MAX_EXPORT_ROWS)
    throw new BadRequestException(
      "Export exceeds 10,000 rows. Narrow the date range and export again. No partial file was generated.",
    );
  return rows;
}

export function completedRevenueByCurrency(
  payments: {
    amount: Prisma.Decimal | string | number;
    currency: string;
    status: string;
  }[],
) {
  const totals = new Map<string, Prisma.Decimal>();
  for (const payment of payments) {
    if (payment.status !== "COMPLETED") continue;
    totals.set(
      payment.currency,
      (totals.get(payment.currency) ?? new Prisma.Decimal(0)).plus(
        payment.amount,
      ),
    );
  }
  return [...totals]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, amount]) => ({ currency, amount: amount.toFixed(2) }));
}

export interface ExportPage {
  before?: { createdAt: Date; id: string };
  asOf: Date;
}
/** Bounded keyset pages: additions after the cutoff cannot shift or duplicate earlier rows. */
export async function csvStream<T extends { id: string; createdAt: Date }>(
  fields: string[],
  load: (page: ExportPage) => Promise<T[]>,
  map: (row: T) => Record<string, unknown>,
) {
  const asOf = new Date();
  const first = await load({ asOf }); // Validate filters and database access before sending headers.
  async function* content() {
    yield "\uFEFF" + new Parser({ fields }).parse([]) + "\n";
    let rows = first;
    const parser = new Parser({ fields, header: false });
    while (rows.length) {
      yield parser.parse(
        rows.map((row) => {
          const mapped = map(row);
          return Object.fromEntries(
            fields.map((field) => [field, spreadsheetText(mapped[field])]),
          );
        }),
      ) + "\n";
      if (rows.length < 1000) return;
      const last = rows[rows.length - 1];
      rows = await load({
        asOf,
        before: { createdAt: last.createdAt, id: last.id },
      });
    }
  }
  return new StreamableFile(Readable.from(content()));
}
