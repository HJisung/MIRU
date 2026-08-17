import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

export class WorkerStorage {
  private readonly bucket = process.env.MINIO_BUCKET ?? "stream-media";
  private readonly client = new S3Client({
    endpoint: required("S3_ENDPOINT"),
    region: process.env.S3_REGION ?? "us-east-1",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: required("S3_ACCESS_KEY"),
      secretAccessKey: required("S3_SECRET_KEY"),
    },
  });

  async download(key: string, destination: string) {
    const object = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!object.Body) throw new Error("SOURCE_OBJECT_EMPTY");
    await pipeline(
      object.Body as NodeJS.ReadableStream,
      createWriteStream(destination),
    );
  }

  async upload(key: string, source: string, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: createReadStream(source),
        ContentType: contentType,
      }),
    );
  }
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}
