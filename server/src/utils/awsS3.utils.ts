import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { awsS3Config } from "config/awsS3.config";
import { appConfig } from "config/app.config";
import { Conditions } from "@aws-sdk/s3-presigned-post/dist-types/types";

export const S3 = new S3Client({
  region: awsS3Config.region,
  credentials: {
    accessKeyId: awsS3Config.accessKeyId,
    secretAccessKey: awsS3Config.secretAccessKey,
  },
});

export const generateSignedUrl = async (command: AnyType): Promise<string> => {
  const url = await getSignedUrl(S3 as AnyType, command, {
    expiresIn: +awsS3Config.signedUrlExpiration,
  });
  return url;
};

export const getAllowedFileCondition = (fileType: string) => {
  const { allowedFileTypes } = appConfig.documents;

  const checkFileAllowed = allowedFileTypes?.find(
    (item: string) =>
      item.includes(fileType) || fileType.includes(item) || item === fileType
  );

  const contentTypePrefix = checkFileAllowed ?? fileType.split("/")[0] ?? "";

  return {
    conditions: [
      "starts-with",
      "$Content-Type",
      contentTypePrefix,
    ] as Conditions,
    contentTypeField: checkFileAllowed ?? fileType,
  };
};
