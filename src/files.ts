import { DeleteObjectCommand, GetObjectCommand, ListObjectsCommand, ListObjectsCommandOutput, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { URL } from "url";
import { env, envRequire } from "./environment.js";

const bucket = envRequire("S3_BUCKET");

const s3Client = new S3Client({
  endpoint: envRequire("S3_ENDPOINT"),
  credentials: {
    accessKeyId: envRequire("S3_ACCESS_KEY_ID"),
    secretAccessKey: envRequire("S3_SECRET_ACCESS_KEY")
  },
  region: "nl-1"
});

export async function deleteFile(options: { uid: string; fileId: string }) {
  await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: `${options.uid}/${options.fileId}` }));
}

export type FileEntry = { key?: string; size?: number; lastModified?: number };

export async function listFiles(options: { uid: string }): Promise<FileEntry[]> {
  let contents: FileEntry[] = [];
  let marker: string | null | undefined = undefined;
  while (marker !== null) {
    const response: ListObjectsCommandOutput = await s3Client.send(
      new ListObjectsCommand({ Bucket: bucket, Prefix: `${options.uid}/`, Marker: marker, Delimiter: options.uid })
    );
    marker = response.IsTruncated ? response.NextMarker : null;
    if (response.Contents) {
      contents = contents.concat(
        response.Contents.map((object) => ({ key: object.Key, size: object.Size, lastModified: object.LastModified?.getTime() } as FileEntry))
      );
    }
  }
  return contents;
}

export async function signDownloadUrl(options: { uid: string; fileId: string; filename: string }, ttl: number): Promise<string> {
  return await _signUrl(
    new GetObjectCommand({
      Bucket: bucket,
      Key: `${options.uid}/${options.fileId}`,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(options.filename)}"`
    }),
    ttl
  );
}

export async function signUploadUrl(options: { uid: string; fileId: string }): Promise<string> {
  return await _signUrl(new PutObjectCommand({ Bucket: bucket, Key: `${options.uid}/${options.fileId}` }), 14400);
}

async function _signUrl(command: any, ttl: number): Promise<string> {
  const signedUrl = new URL(
    await getSignedUrl(s3Client, command, {
      expiresIn: ttl
    })
  );
  signedUrl.hostname = env("S3_HOSTNAME_REPLACEMENT") ?? signedUrl.hostname;
  return signedUrl.href;
}
