const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");

const s3 = new S3Client({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  forcePathStyle: true, // нужно для MinIO/Selectel, для R2 тоже не мешает
  credentials: {
    accessKeyId: config.s3.accessKey,
    secretAccessKey: config.s3.secretKey,
  },
});

// folder: "products" | "categories" | "reviews" — как в исходном ТЗ.
async function uploadBuffer(buffer, folder, mimeType) {
  const ext = (mimeType && mimeType.split("/")[1]) || "jpg";
  const key = `${folder}/${uuidv4()}.${ext}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: "public-read",
    })
  );
  return `${config.s3.publicUrl.replace(/\/$/, "")}/${key}`;
}

module.exports = { uploadBuffer };
