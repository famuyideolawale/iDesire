import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const folder = path.join(process.cwd(), ".local", "media");
function storage() {
  if (!process.env.AWS_ENDPOINT_URL_S3) {
    if (process.env.DATABASE_URL || process.env.RENDER === "true")
      throw new Error("Persistent image storage configuration is required.");
    return null;
  }
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, MEDIA_BUCKET } = process.env;
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !MEDIA_BUCKET)
    throw new Error("Image storage configuration is incomplete.");
  return {
    bucket: MEDIA_BUCKET,
    client: new S3Client({
      endpoint: process.env.AWS_ENDPOINT_URL_S3, region: AWS_REGION,
      forcePathStyle: true,
      credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
    }),
  };
}
export async function saveMedia(name: string, bytes: Buffer, contentType: string) {
  const remote = storage();
  if (remote) {
    await remote.client.send(new PutObjectCommand({ Bucket: remote.bucket, Key: name, Body: bytes, ContentType: contentType }));
  } else {
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, name), bytes);
  }
}
export async function loadMedia(name: string): Promise<Uint8Array> {
  const remote = storage();
  if (!remote) return readFile(path.join(folder, name));
  const result = await remote.client.send(new GetObjectCommand({ Bucket: remote.bucket, Key: name }));
  if (!result.Body) throw new Error("Image not found.");
  return result.Body.transformToByteArray();
}
