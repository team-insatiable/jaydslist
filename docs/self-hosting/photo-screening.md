# Photo screening and consent

Users choose whether to allow nude or sexually explicit photos during profile setup and can change the choice under Profile → Preferences. The default is No, including for existing accounts. Opted-out viewers see heavily blurred NSFW listing previews with a badge; clear listing images and incoming explicit message photos and albums require opt-in; it does not prevent viewing one's own vault.

New uploads are screened with Amazon Rekognition's `DetectModerationLabels` before being stored in Cloudflare Images. JPEG and PNG images up to 5MB are supported. Amazon receives the image bytes for analysis; no S3 bucket or additional server is needed. Inform users of this processing in the operator's privacy policy.

## Local development

`pnpm dev` stores photo bytes in the local KV emulator under `.wrangler/state/v3`. It does not call Cloudflare Images or AWS, even if credentials are present in `.dev.vars`. Browser tests use their separate `.wrangler/e2e/v3` storage.

Vault, listing, and message uploaders show **Local test: simulate photo screening** with Safe, NSFW, and Uncertain choices. Upload any supported image and select the outcome you want to exercise. These are simulated classifications, not actual nudity detection. Use two accounts to check that NSFW sends fail when the recipient selects No, then succeed after they select Yes. Uncertain images cannot be shared regardless of that preference.

This mode uses SvelteKit's compile-time development flag; it is unavailable in production builds and cannot be enabled by a request field. Production ignores simulated ratings. No additional database, credentials, migrations, or hosted development resources are required. Do not configure remote bindings for local development.

## AWS setup

Create separate IAM credentials with only this permission, rather than expanding an SES credential's permissions:

```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Effect": "Allow",
			"Action": "rekognition:DetectModerationLabels",
			"Resource": "*"
		}
	]
}
```

Set `REKOGNITION_REGION` for the AWS region you use. For explicit testing of a production build, put `REKOGNITION_ACCESS_KEY_ID` and `REKOGNITION_SECRET_ACCESS_KEY` in `.dev.vars`. Normal `pnpm dev` does not use them. In production, set them as Worker secrets in your own Cloudflare account. Temporary credentials also need `REKOGNITION_SESSION_TOKEN`. Never commit credentials. The Cloudflare Images API token must permit image uploads, downloads, updates, and deletes.

If screening is not configured or fails, uploads fail without delivering an unclassified image. Text features remain available. The application makes no AWS account or IAM changes automatically.

## Classification

The Explicit group (including exposed genitals, exposed female nipples, exposed buttocks/anus, explicit sexual activity, and sex toys) requires NSFW opt-in. Swimwear, underwear, shirtless photos, implied nudity, and kissing do not automatically require it.

`PHOTO_NSFW_CONFIDENCE` defaults to 80 and `PHOTO_REVIEW_CONFIDENCE` to 50. Both use the normal configuration precedence: database override, environment variable, then default. Explicit labels at or above the first threshold are NSFW; labels between thresholds are unknown and cannot be shared. Confidence scores are model output, not an accuracy guarantee. Evaluate false positives and negatives before enabling live uploads.

## Deployment and existing photos

Apply `0019_photo_content_preferences.sql` in the operator's database before deploying this revision. This migration sets existing photos to unknown and existing users to No. No application changes automatically migrate a production database.

Old photos remain visible to their owner. In an album, the owner can choose **Screen before sharing**. This also changes the old image to require signed Cloudflare delivery before recording the screening result. Old GIF/WebP or oversized images must be replaced with a supported upload.

Before announcing enforcement, make every existing Cloudflare image private (`requireSignedURLs: true`), including soft-deleted photos retained by listings, and verify that no delivery variant uses `neverRequireSignedURLs`. Existing publicly delivered URLs may have been cached or copied; changing application URLs does not revoke those copies. This resource change requires explicit operator authorization and a verified Cloudflare account.

New images require signed URLs. The app serves image bytes through an authenticated, uncached endpoint that checks current viewer preferences and listing/message access. Previously shared albums are filtered on every access, so adding a new explicit photo cannot bypass a recipient's choice. Revoking opt-in blocks subsequent deliveries; already viewed or saved images cannot be recalled.

The authenticated endpoint downloads image bytes from Cloudflare Images. With `CF_IMAGES_SIGNING_KEY` configured it fetches a short-lived signed URL internally using the `jaydslistPrivateOriginal` variant; it never redirects the browser to that URL. Configure this variant with `fit: scale-down`, width and height 9999, `metadata: none`, and `neverRequireSignedURLs: false`. This preserves the full image frame (large images may be scaled down), including for screening older photos. Never use a cropped variant for this purpose. Obtain an existing Images signing key from the Images Keys page and store it as a Worker secret; do not print or commit it. Without that key the endpoint uses the original-export API, which some credentials reject even when other Images operations work. This keeps preferences enforceable but adds a Worker request and D1 authorization queries per image while preserving the full image frame. Include that overhead in capacity and cost estimates.

## Blurred ad previews

Create the private `jaydslistNsfwBlur` variant with `fit: scale-down`, width and height 64, `blur: 250`, `metadata: none`, and `neverRequireSignedURLs: false`. It uses the same `CF_IMAGES_SIGNING_KEY` as full-frame delivery. The authenticated photo endpoint serves this variant only for NSFW photos attached to active, unexpired listings after checking blocks. Clear image requests remain forbidden for opted-out viewers, and uncertain photos remain hidden. Message delivery and sending restrictions are unchanged. Missing signing configuration or failed blur delivery never falls back to the clear image.

In local development, NSFW ad previews use an opaque generated placeholder instead of source pixels; Cloudflare performs the real blur in production.
