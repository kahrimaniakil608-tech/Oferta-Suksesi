import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";
import { randomBytes } from "crypto";

export interface ProcessedImage {
  url: string;
  thumbUrl: string;
  mediumUrl: string;
}

const ALLOWED_MIMETYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_INPUT_PIXELS = 40_000_000;

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);
  private readonly uploadDir: string;
  private readonly publicUrl: string;
  private watermarkBuffer: Buffer | null = null;
  private logoBuffer: Buffer | null = null;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = path.resolve(
      this.config.get<string>("UPLOAD_DIR", "./uploads"),
    );
    this.publicUrl = this.config
      .get<string>("PUBLIC_URL", "http://localhost:4001")
      .replace(/\/$/, "");
    this.loadWatermark();
    this.loadLogo();
  }

  private async loadWatermark() {
    // Check multiple possible locations for the watermark file
    const candidates = [
      path.join(__dirname, "..", "..", "assets", "watermark.png"), // dev: dist/../assets/
      path.join(__dirname, "..", "assets", "watermark.png"), // nested dist
      path.join(
        process.cwd(),
        "apps",
        "image-service",
        "assets",
        "watermark.png",
      ), // monorepo root
      path.join(process.cwd(), "assets", "watermark.png"), // docker working dir
    ];

    try {
      const watermarkPath = candidates.find((p) => fs.existsSync(p));
      if (watermarkPath) {
        this.watermarkBuffer = await sharp(watermarkPath)
          .resize(200, undefined, { fit: "inside", withoutEnlargement: true })
          .png()
          .toBuffer();
        this.logger.log(`Watermark loaded from ${watermarkPath}`);
      } else {
        this.logger.warn(
          `Watermark not found in any location — images will not be watermarked`,
        );
      }
    } catch (err) {
      this.logger.warn("Failed to load watermark: " + (err as Error).message);
    }
  }

  private async loadLogo() {
    const candidates = [
      path.join(__dirname, "..", "..", "assets", "logo.png"),
      path.join(__dirname, "..", "assets", "logo.png"),
      path.join(process.cwd(), "apps", "image-service", "assets", "logo.png"),
      path.join(process.cwd(), "assets", "logo.png"),
    ];

    try {
      const logoPath = candidates.find((p) => fs.existsSync(p));
      if (logoPath) {
        this.logoBuffer = await sharp(logoPath).png().toBuffer();
        this.logger.log(`Logo loaded from ${logoPath}`);
      } else {
        this.logger.warn("Logo not found — social images will not have a logo");
      }
    } catch (err) {
      this.logger.warn("Failed to load logo: " + (err as Error).message);
    }
  }

  // ─── Social image generation (Instagram) ──────────────────────────────────

  async generateSocialImage(
    listingId: string,
    imagePath: string,
    title: string,
  ): Promise<string> {
    const SIZE = 1080;
    this.validateIdentifier(listingId);
    if (typeof title !== "string" || !title.trim() || title.length > 200)
      throw new BadRequestException("Invalid social image title");
    const fullImagePath = this.resolveListingImage(imagePath);

    if (!fs.existsSync(fullImagePath)) {
      throw new NotFoundException(`Image not found: ${imagePath}`);
    }

    // Resize listing photo to 1080x1080 cover
    const background = await sharp(fullImagePath, {
      limitInputPixels: MAX_INPUT_PIXELS,
    })
      .resize(SIZE, SIZE, { fit: "cover", position: "centre" })
      .jpeg({ quality: 95 })
      .toBuffer();

    // Create gradient overlay at bottom (dark gradient for text readability)
    const gradientSvg = `<svg width="${SIZE}" height="${SIZE}">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="black" stop-opacity="0"/>
          <stop offset="50%" stop-color="black" stop-opacity="0"/>
          <stop offset="85%" stop-color="black" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="black" stop-opacity="0.8"/>
        </linearGradient>
      </defs>
      <rect width="${SIZE}" height="${SIZE}" fill="url(#grad)"/>
    </svg>`;

    // Prepare title text SVG
    const escapedTitle = title
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

    // Split long titles into lines (~30 chars per line max)
    const words = escapedTitle.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    for (const word of words) {
      if ((currentLine + " " + word).trim().length > 30 && currentLine) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine = (currentLine + " " + word).trim();
      }
    }
    if (currentLine) lines.push(currentLine.trim());
    // Limit to 3 lines
    if (lines.length > 3) {
      lines.length = 3;
      lines[2] = lines[2].substring(0, 27) + "...";
    }

    const lineHeight = 52;
    const textBlockHeight = lines.length * lineHeight + 40;
    const textY = SIZE - textBlockHeight;

    const titleSvg = `<svg width="${SIZE}" height="${SIZE}">
      <style>
        .title { font-family: Arial, Helvetica, sans-serif; font-size: 44px; font-weight: bold; fill: white; }
      </style>
      ${lines.map((line, i) => `<text x="${SIZE / 2}" y="${textY + i * lineHeight}" text-anchor="middle" class="title">${line}</text>`).join("\n")}
    </svg>`;

    const composites: sharp.OverlayOptions[] = [
      { input: Buffer.from(gradientSvg), top: 0, left: 0 },
      { input: Buffer.from(titleSvg), top: 0, left: 0 },
    ];

    // Add logo at top center if available
    if (this.logoBuffer) {
      const logoResized = await sharp(this.logoBuffer)
        .resize(160, 80, { fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();
      const logoMeta = await sharp(logoResized).metadata();
      const logoLeft = Math.round((SIZE - (logoMeta.width || 160)) / 2);
      composites.push({ input: logoResized, top: 30, left: logoLeft });
    }

    // Compose final image
    const socialDir = this.containedPath("social");
    this.ensureDir(socialDir);

    const filename = `${listingId}-${Date.now()}.jpg`;
    const outputPath = path.join(socialDir, filename);

    await sharp(background)
      .composite(composites)
      .jpeg({ quality: 92 })
      .toFile(outputPath);

    this.logger.log(
      `Generated social image for listing ${listingId}: ${filename}`,
    );
    return this.toPublicUrl(outputPath);
  }

  private async applyWatermark(
    pipeline: sharp.Sharp,
    targetWidth: number,
  ): Promise<sharp.Sharp> {
    if (!this.watermarkBuffer) return pipeline;

    // Scale watermark proportionally to image size (about 20% of image width)
    const { data, info } = await pipeline
      .raw()
      .toBuffer({ resolveWithObject: true });
    const wmWidth = Math.max(
      1,
      Math.round(Math.min(targetWidth, info.width) * 0.2),
    );
    const wmHeight = Math.max(1, Math.round(info.height * 0.3));
    const scaledWatermark = await sharp(this.watermarkBuffer)
      .resize(wmWidth, wmHeight, { fit: "inside", withoutEnlargement: true })
      .ensureAlpha()
      .composite([
        {
          input: Buffer.from([255, 255, 255, Math.round(255 * 0.4)]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: "dest-in",
        },
      ])
      .png()
      .toBuffer();

    return sharp(data, {
      raw: { width: info.width, height: info.height, channels: info.channels },
    }).composite([
      {
        input: scaledWatermark,
        gravity: "southeast",
      },
    ]);
  }

  // ─── Validation ───────────────────────────────────────────────────────────

  validateFiles(files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException("No files provided");
    }
    if (files.length > 8) {
      throw new BadRequestException("Maximum 8 images per upload");
    }
    for (const file of files) {
      if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid file type "${file.mimetype}". Allowed: JPEG, PNG, WebP`,
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException(
          `File "${file.originalname}" exceeds 5MB limit`,
        );
      }
    }
  }

  // ─── Directory helpers ────────────────────────────────────────────────────

  private ensureDir(dirPath: string) {
    this.containedPath(path.relative(this.uploadDir, dirPath));
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private listingDir(listingId: string) {
    this.validateIdentifier(listingId);
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return this.containedPath("listings", year, month, listingId);
  }

  private companyDir(companyId: string) {
    this.validateIdentifier(companyId);
    return this.containedPath("companies", companyId);
  }

  private validateIdentifier(id: string) {
    if (
      typeof id !== "string" ||
      !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(id)
    ) {
      throw new BadRequestException("Invalid image resource identifier");
    }
  }

  private containedPath(...parts: string[]) {
    const resolved = path.resolve(this.uploadDir, ...parts);
    const relative = path.relative(this.uploadDir, resolved);
    if (
      !relative ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    ) {
      throw new BadRequestException(
        "Image path is outside the upload directory",
      );
    }
    // Refuse existing symlinks, including dangling ones, before reading or writing.
    let current = this.uploadDir;
    for (const part of relative.split(path.sep)) {
      current = path.join(current, part);
      try {
        if (fs.lstatSync(current).isSymbolicLink())
          throw new BadRequestException("Image paths cannot contain symlinks");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    return resolved;
  }

  private resolveListingImage(reference: string) {
    if (typeof reference !== "string")
      throw new BadRequestException("Invalid image reference");
    let relative = reference;
    if (/^https?:\/\//i.test(reference)) {
      const url = new URL(reference);
      if (url.origin !== new URL(this.publicUrl).origin)
        throw new BadRequestException(
          "Image must belong to this image service",
        );
      relative = url.pathname;
    }
    relative = relative.replace(/^\/?uploads\//, "");
    if (
      !/^listings\/\d{4}\/(?:0[1-9]|1[0-2])\/[a-zA-Z0-9_-]+\/(?:original|medium|thumb)\/[a-zA-Z0-9_-]+\.(?:webp|png|jpe?g)$/i.test(
        relative,
      )
    ) {
      throw new BadRequestException("Invalid listing image path");
    }
    return this.containedPath(relative);
  }

  private async inspectFile(file: Express.Multer.File) {
    try {
      const metadata = await sharp(file.buffer, {
        limitInputPixels: MAX_INPUT_PIXELS,
      }).metadata();
      if (
        !metadata.format ||
        !["jpeg", "png", "webp"].includes(metadata.format)
      )
        throw new Error("Unsupported image");
    } catch {
      throw new BadRequestException(
        "Image data is invalid or exceeds the processing limit",
      );
    }
  }

  async deleteStoredFiles(batchId: string, files: string[]) {
    this.validateIdentifier(batchId);
    if (!Array.isArray(files) || files.length > 24)
      throw new BadRequestException("Invalid stored keys");
    const paths = files.map((key) => {
      if (
        !/^(listings|companies|ads)\/[a-zA-Z0-9_./-]+$/.test(key) ||
        !key.split("/").includes(batchId) ||
        key.split("/").some((part) => part === ".." || part === ".")
      )
        throw new BadRequestException("Invalid stored key");
      return this.containedPath(key);
    });
    for (const file of paths)
      await fs.promises.unlink(file).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
    return { deleted: paths.length };
  }

  private buildFilename(): string {
    const ts = Date.now();
    const rand = randomBytes(4).toString("hex");
    return `${ts}-${rand}.webp`;
  }

  private toPublicUrl(filePath: string): string {
    this.containedPath(path.relative(this.uploadDir, filePath));
    // Convert absolute fs path to public URL
    const relative = path
      .relative(this.uploadDir, filePath)
      .replace(/\\/g, "/");
    return `${this.publicUrl}/uploads/${relative}`;
  }

  // ─── Processing ───────────────────────────────────────────────────────────

  async processAndSave(
    files: Express.Multer.File[],
    listingId: string,
  ): Promise<ProcessedImage[]> {
    this.validateFiles(files);
    this.validateIdentifier(listingId);
    const results: ProcessedImage[] = [];

    const written: string[] = [];
    try {
      for (const file of files) {
        await this.inspectFile(file);
        const thumbDir = path.join(this.listingDir(listingId), "thumb");
        const mediumDir = path.join(this.listingDir(listingId), "medium");
        const origDir = path.join(this.listingDir(listingId), "original");

        this.ensureDir(thumbDir);
        this.ensureDir(mediumDir);
        this.ensureDir(origDir);

        const filename = this.buildFilename();

        const thumbPath = path.join(thumbDir, filename);
        const mediumPath = path.join(mediumDir, filename);
        const origPath = path.join(origDir, filename);

        written.push(thumbPath, mediumPath, origPath);
        // Base pipeline: auto-orient from EXIF, strip all metadata
        // rotate() auto-orients from EXIF; sharp strips all metadata by default
        const base = sharp(file.buffer, {
          limitInputPixels: MAX_INPUT_PIXELS,
        }).rotate();

        // Prepare all pipelines before starting disk writes. A watermark error
        // must not race a still-running write during cleanup.
        const thumbPipeline = base
          .clone()
          .resize(150, 150, { fit: "cover", position: "centre" })
          .webp({ quality: 80 });
        const mediumPipeline = (
          await this.applyWatermark(
            base
              .clone()
              .resize(600, undefined, {
                fit: "inside",
                withoutEnlargement: true,
              }),
            600,
          )
        ).webp({ quality: 85 });
        const originalPipeline = (
          await this.applyWatermark(
            base
              .clone()
              .resize(1200, undefined, {
                fit: "inside",
                withoutEnlargement: true,
              }),
            1200,
          )
        ).webp({ quality: 90 });
        const thumbTask = thumbPipeline.toFile(thumbPath);
        const mediumTask = mediumPipeline.toFile(mediumPath);
        const origTask = originalPipeline.toFile(origPath);

        const completed = await Promise.allSettled([
          thumbTask,
          mediumTask,
          origTask,
        ]);
        const failed = completed.find((result) => result.status === "rejected");
        if (failed?.status === "rejected") throw failed.reason;

        this.logger.log(`Processed image ${filename} for listing ${listingId}`);

        results.push({
          url: this.toPublicUrl(origPath),
          thumbUrl: this.toPublicUrl(thumbPath),
          mediumUrl: this.toPublicUrl(mediumPath),
        });
      }

      return results;
    } catch (error) {
      await Promise.all(
        written.map((file) => fs.promises.unlink(file).catch(() => {})),
      );
      throw error;
    }
  }

  // ─── Company logo / cover ─────────────────────────────────────────────────

  async processCompanyLogo(
    file: Express.Multer.File,
    companyId: string,
  ): Promise<string> {
    this.validateFiles([file]);
    await this.inspectFile(file);
    const dir = path.join(this.companyDir(companyId), "logo");
    this.ensureDir(dir);
    const filename = this.buildFilename();
    const filePath = path.join(dir, filename);
    await sharp(file.buffer, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize(400, 400, { fit: "cover", position: "centre" })
      .webp({ quality: 85 })
      .toFile(filePath)
      .catch(async (error) => {
        await fs.promises.unlink(filePath).catch(() => {});
        throw error;
      });
    this.logger.log(`Processed logo for company ${companyId}`);
    return `/uploads/companies/${companyId}/logo/${filename}`;
  }

  async processCompanyCover(
    file: Express.Multer.File,
    companyId: string,
  ): Promise<string> {
    this.validateFiles([file]);
    await this.inspectFile(file);
    const dir = path.join(this.companyDir(companyId), "cover");
    this.ensureDir(dir);
    const filename = this.buildFilename();
    const filePath = path.join(dir, filename);
    await sharp(file.buffer, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize(1200, 400, { fit: "cover", position: "centre" })
      .webp({ quality: 85 })
      .toFile(filePath)
      .catch(async (error) => {
        await fs.promises.unlink(filePath).catch(() => {});
        throw error;
      });
    this.logger.log(`Processed cover for company ${companyId}`);
    return `/uploads/companies/${companyId}/cover/${filename}`;
  }

  // ─── Ad banner ──────────────────────────────────────────────────────────

  private adDir(adId: string) {
    this.validateIdentifier(adId);
    return this.containedPath("ads", adId);
  }

  async processAdBanner(
    file: Express.Multer.File,
    adId: string,
    width?: number,
    height?: number,
  ): Promise<string> {
    this.validateFiles([file]);
    await this.inspectFile(file);
    const dir = path.join(this.adDir(adId), "banner");
    this.ensureDir(dir);
    const filename = this.buildFilename();
    const filePath = path.join(dir, filename);

    let pipeline = sharp(file.buffer, {
      limitInputPixels: MAX_INPUT_PIXELS,
    }).rotate();
    if (width && height) {
      pipeline = pipeline.resize(width, height, {
        fit: "cover",
        position: "centre",
      });
    } else {
      pipeline = pipeline.resize(1200, undefined, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }
    await pipeline
      .webp({ quality: 90 })
      .toFile(filePath)
      .catch(async (error) => {
        await fs.promises.unlink(filePath).catch(() => {});
        throw error;
      });

    this.logger.log(`Processed ad banner for ad ${adId}`);
    return this.toPublicUrl(filePath);
  }
}
