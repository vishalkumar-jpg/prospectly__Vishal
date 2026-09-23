import { getOsEnv, getOsEnvOptional } from "./env.config";

export const awsS3Config = {
  region: getOsEnv("AWS_REGION"),
  accessKeyId: getOsEnv("AWS_ACCESS_KEY_ID"),
  secretAccessKey: getOsEnv("AWS_SECRET_ACCESS_KEY"),
  bucketName: getOsEnv("AWS_S3_BUCKET_NAME"),
  signedUrlExpiration: (() => {
    const value = +getOsEnv("AWS_SIGNED_URL_EXPIRATION");
    if (isNaN(value) || value <= 0) {
      throw new Error("AWS_SIGNED_URL_EXPIRATION must be a positive number");
    }
    return value;
  })(),
  cloudFrontUrl: getOsEnv("AWS_CLOUDFRONT_URL"),
  mediaProspectlyUrl: getOsEnvOptional("AWS_MEDIA_URL"),
};
