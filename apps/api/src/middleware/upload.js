import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { asyncHandler } from "../utils/asyncHandler.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.UPLOAD_MAX_BYTES || 5 * 1024 * 1024)
  }
});

const uploadToCloudinary = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: process.env.CLOUDINARY_FOLDER || "team-hub" },
      (error, uploadResult) => {
        if (error) return reject(error);
        return resolve(uploadResult);
      }
    );

    stream.end(req.file.buffer);
  });

  req.uploadedFile = result;
  return next();
});

export const uploadSingle = (fieldName) => [upload.single(fieldName), uploadToCloudinary];
