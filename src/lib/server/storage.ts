import {
	CreateBucketCommand,
	GetObjectCommand,
	HeadBucketCommand,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3';
import {
	S3_ACCESS_KEY,
	S3_BUCKET,
	S3_ENDPOINT,
	S3_PUBLIC_URL,
	S3_REGION,
	S3_SECRET_KEY
} from '$app/env/private';

const s3 = new S3Client({
	endpoint: S3_ENDPOINT,
	region: S3_REGION,
	forcePathStyle: true,
	credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY }
});

let bucketReady: Promise<void> | undefined;

/** Create the bucket on first use, so a fresh self-hosted install needs no setup step. */
function ensureBucket() {
	bucketReady ??= s3
		.send(new HeadBucketCommand({ Bucket: S3_BUCKET }))
		.then(() => undefined)
		.catch(async () => {
			await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
		})
		.catch((err) => {
			bucketReady = undefined;
			throw err;
		});
	return bucketReady;
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
	await ensureBucket();
	await s3.send(
		new PutObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
			Body: body,
			ContentType: contentType,
			CacheControl: 'public, max-age=31536000, immutable'
		})
	);
}

export async function getObject(key: string) {
	await ensureBucket();
	const res = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
	return {
		body: res.Body!.transformToWebStream(),
		contentType: res.ContentType ?? 'application/octet-stream',
		contentLength: res.ContentLength
	};
}

/** Browser-facing URL for an object key. Keys are content-addressed or random, so they never change. */
export function publicUrl(key: string) {
	return S3_PUBLIC_URL ? `${S3_PUBLIC_URL.replace(/\/$/, '')}/${key}` : `/files/${key}`;
}
