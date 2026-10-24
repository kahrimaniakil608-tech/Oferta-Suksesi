import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';
import { TwitterApi } from 'twitter-api-v2';
import { MediaService } from '../../media/media.service';

export interface SocialResult {
  platform: string;
  success: boolean;
  url?: string;
  error?: string;
}

@Injectable()
export class SocialMediaService {
  private readonly logger = new Logger(SocialMediaService.name);
  private readonly siteUrl: string;
  private readonly imageServiceUrl: string;

  // Facebook
  private readonly fbPageId: string;
  private readonly fbAccessToken: string;

  // Twitter
  private readonly twitterApiKey: string;
  private readonly twitterApiSecret: string;
  private readonly twitterAccessToken: string;
  private readonly twitterAccessSecret: string;

  // Instagram
  private readonly igAccountId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly media: MediaService,
  ) {
    this.siteUrl = this.config.get<string>('SITE_URL', 'https://ofertasuksesi.com');
    this.imageServiceUrl = this.config.get<string>('IMAGE_SERVICE_URL', 'http://localhost:4001');

    this.fbPageId = this.config.get<string>('FACEBOOK_PAGE_ID', '');
    this.fbAccessToken = this.config.get<string>('FACEBOOK_PAGE_ACCESS_TOKEN', '');

    this.twitterApiKey = this.config.get<string>('TWITTER_API_KEY', '');
    this.twitterApiSecret = this.config.get<string>('TWITTER_API_SECRET', '');
    this.twitterAccessToken = this.config.get<string>('TWITTER_ACCESS_TOKEN', '');
    this.twitterAccessSecret = this.config.get<string>('TWITTER_ACCESS_TOKEN_SECRET', '');

    this.igAccountId = this.config.get<string>('INSTAGRAM_BUSINESS_ACCOUNT_ID', '');
  }

  async publishToSocial(
    listingId: string,
    platforms: string[],
    adminId: string,
  ): Promise<SocialResult[]> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        images: { orderBy: { position: 'asc' }, take: 1 },
        category: { select: { name: true, slug: true } },
        city: { select: { name: true, slug: true } },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const listingUrl = `${this.siteUrl}/shpalljet/${listing.slug}`;
    const primaryImage = listing.images[0];
    const cityName = listing.city?.name || '';
    const categorySlug = listing.category?.slug || '';
    const citySlug = listing.city?.slug || '';

    // Build post text
    const description = (listing.description || '')
      .replace(/<[^>]*>/g, '') // strip HTML
      .substring(0, 200)
      .trim();

    const postText = [
      listing.title,
      cityName,
      '',
      description ? description + '...' : '',
      '',
      listingUrl,
    ]
      .filter((line, i) => line !== '' || i === 2 || i === 4)
      .join('\n')
      .trim();

    const results: SocialResult[] = [];

    for (const platform of platforms) {
      try {
        let result: SocialResult;
        switch (platform) {
          case 'facebook':
            result = await this.postToFacebook(postText, listingUrl, primaryImage?.url ? this.publicImageUrl(primaryImage.url) : undefined);
            break;
          case 'twitter':
            result = await this.postToTwitter(postText, listingUrl);
            break;
          case 'instagram': {
            const igCaption = [
              `${listing.title} | ${cityName}`,
              '',
              description ? description + '...' : '',
              '',
              `#ofertasuksesi #${categorySlug.replace(/-/g, '')} #${citySlug.replace(/-/g, '')}`,
            ].join('\n');
            result = await this.postToInstagram(
              listingId,
              igCaption,
              listing.title,
              primaryImage?.url,
            );
            break;
          }
          default:
            result = { platform, success: false, error: 'Unknown platform' };
        }
        results.push(result);
      } catch (err) {
        this.logger.error(`Failed to post to ${platform}: ${(err as Error).message}`);
        results.push({
          platform,
          success: false,
          error: (err as Error).message,
        });
      }

      // Log to moderation logs
      try {
        const lastResult = results[results.length - 1];
        await this.prisma.moderationLog.create({
          data: {
            listingId,
            moderatorId: adminId,
            action: `SOCIAL_SHARE_${platform.toUpperCase()}`,
            reason: lastResult.success
              ? `Published to ${platform}: ${lastResult.url || 'OK'}`
              : `Failed to publish to ${platform}: ${lastResult.error}`,
          },
        });
      } catch {
        // Don't fail the whole operation if logging fails
      }
    }

    return results;
  }

  // ─── Facebook ─────────────────────────────────────────────────────────────

  private publicImageUrl(reference: string) {
    if (/^https?:\/\//i.test(reference)) return reference;
    const base = this.config.get<string>('NEXT_PUBLIC_IMAGE_URL', this.config.get<string>('PUBLIC_URL', 'http://localhost:4001')).replace(/\/$/, '');
    return `${base}/${reference.replace(/^\/?uploads\//, '').replace(/^\//, '').replace(/^/, 'uploads/')}`;
  }

  private async postToFacebook(
    text: string,
    listingUrl: string,
    imageUrl?: string,
  ): Promise<SocialResult> {
    if (!this.fbPageId || !this.fbAccessToken) {
      return { platform: 'facebook', success: false, error: 'Facebook credentials not configured' };
    }

    try {
      let response;
      if (imageUrl) {
        // Post with image
        response = await axios.post(
          `https://graph.facebook.com/v19.0/${this.fbPageId}/photos`,
          {
            url: imageUrl,
            caption: text,
            access_token: this.fbAccessToken,
          },
        );
      } else {
        // Post with link only
        response = await axios.post(
          `https://graph.facebook.com/v19.0/${this.fbPageId}/feed`,
          {
            message: text,
            link: listingUrl,
            access_token: this.fbAccessToken,
          },
        );
      }

      const postId = response.data?.id || response.data?.post_id;
      return {
        platform: 'facebook',
        success: true,
        url: postId ? `https://www.facebook.com/${postId}` : undefined,
      };
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.message;
      return { platform: 'facebook', success: false, error: message };
    }
  }

  // ─── Twitter / X ──────────────────────────────────────────────────────────

  private async postToTwitter(
    text: string,
    listingUrl: string,
  ): Promise<SocialResult> {
    if (!this.twitterApiKey || !this.twitterAccessToken) {
      return { platform: 'twitter', success: false, error: 'Twitter credentials not configured' };
    }

    try {
      const client = new TwitterApi({
        appKey: this.twitterApiKey,
        appSecret: this.twitterApiSecret,
        accessToken: this.twitterAccessToken,
        accessSecret: this.twitterAccessSecret,
      });

      // Twitter has 280 char limit — truncate text if needed
      const maxLen = 280 - listingUrl.length - 2; // 2 for newlines
      const truncatedText = text.length > maxLen
        ? text.substring(0, maxLen - 3) + '...'
        : text;

      const tweet = await client.v2.tweet(`${truncatedText}\n\n${listingUrl}`);
      const tweetId = tweet.data?.id;

      return {
        platform: 'twitter',
        success: true,
        url: tweetId ? `https://x.com/i/status/${tweetId}` : undefined,
      };
    } catch (err: any) {
      const message = err.data?.detail || err.message;
      return { platform: 'twitter', success: false, error: message };
    }
  }

  // ─── Instagram ────────────────────────────────────────────────────────────

  private async postToInstagram(
    listingId: string,
    caption: string,
    title: string,
    imageUrl?: string,
  ): Promise<SocialResult> {
    if (!this.igAccountId || !this.fbAccessToken) {
      return { platform: 'instagram', success: false, error: 'Instagram credentials not configured' };
    }

    if (!imageUrl) {
      return { platform: 'instagram', success: false, error: 'No image available for Instagram post' };
    }

    try {
      // Generate social image via image-service
      const uploadToken = await this.media.issueSocialPermit(listingId, imageUrl, title);
      const imageResponse = await axios.post(
        `${this.imageServiceUrl}/images/social/${listingId}`,
        { imagePath: imageUrl, title },
        { headers: { Authorization: `Bearer ${uploadToken}` }, timeout: 30000 },
      );
      const socialImageUrl = imageResponse.data?.url;

      if (!socialImageUrl) {
        return { platform: 'instagram', success: false, error: 'Failed to generate social image' };
      }

      // Step 1: Create media container
      const containerResponse = await axios.post(
        `https://graph.facebook.com/v19.0/${this.igAccountId}/media`,
        {
          image_url: socialImageUrl,
          caption,
          access_token: this.fbAccessToken,
        },
      );
      const creationId = containerResponse.data?.id;

      if (!creationId) {
        return { platform: 'instagram', success: false, error: 'Failed to create media container' };
      }

      // Step 2: Wait briefly for container to be ready
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 3: Publish
      const publishResponse = await axios.post(
        `https://graph.facebook.com/v19.0/${this.igAccountId}/media_publish`,
        {
          creation_id: creationId,
          access_token: this.fbAccessToken,
        },
      );

      const mediaId = publishResponse.data?.id;
      return {
        platform: 'instagram',
        success: true,
        url: mediaId ? `https://www.instagram.com/p/${mediaId}` : undefined,
      };
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.message;
      return { platform: 'instagram', success: false, error: message };
    }
  }
}
