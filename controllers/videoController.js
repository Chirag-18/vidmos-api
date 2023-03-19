const uuid = require("uuid");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

const Video = require("../models/videoModel");
const catchAsync = require("../utility/catchAsync");
const AppError = require("../utility/appError");
const User = require("../models/userModel");

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUDNAME,
  api_key: process.env.CLOUDINARY_APIKEY,
  api_secret: process.env.CLOUDINARY_APISECRET,
});

exports.uploadVideo = catchAsync(async (req, res, next) => {
  const { _id } = req.user;
  const videoToUpload = req.file;

  const { title, description, category } = req.body;

  if (!videoToUpload) {
    return next(new AppError("Please upload a file", 400));
  }

  const user = await User.findById(_id);

  if (!user) {
    return next(new AppError("Invalid Account login or signup first"));
  }

  const videoName = `${user._id}-${uuid.v4()}-${Date.now()}-${
    videoToUpload.originalname
  }`;

  const cloudinaryStream = cloudinary.uploader.upload_stream(
    {
      folder: "Dev",
      public_id: videoName,
      resource_type: "video",
      chunk_size: 60000000,
    },
    async (error, result) => {
      if (error) {
        console.log(error);
        return next(new AppError("Error upload video", 500));
      } else {
        const video = new Video({
          title,
          description,
          category,
          uploadedBy: user._id,
          fileUrl: result.secure_url,
        });

        JSON.parse(req.body.keywords).forEach((keyword) => {
          video.keywords.push(keyword);
        });

        await video.save();

        user.uploadedVideos.push(video._id);
        await user.save();

        res.status(201).json({
          status: "success",
          message: "Video has been uploaded",
          data: {
            video,
          },
        });
      }
    }
  );

  streamifier.createReadStream(videoToUpload.buffer).pipe(cloudinaryStream);
});

exports.deleteVideo = catchAsync(async (req, res, next) => {
  const { _id } = req.user;
  const videoId = req.params.id;

  const video = await Video.findById(videoId);

  if (!video) {
    return next(new AppError("Video not found with this id"));
  }

  const user = await User.findOne({ _id });

  if (!user) {
    return next(new AppError("Invalid Account login or signup first"));
  }

  if (!user.uploadedVideos.includes(videoId)) {
    return next(new AppError("Only owner can delete this video."));
  }

  await Video.deleteOne({ _id: videoId });
  await User.updateOne({ _id }, { $pull: { uploadedVideos: videoId } });

  res.status(204).json({});
});

exports.getVideo = catchAsync(async (req, res, next) => {
  const videoId = req.params.id;

  const video = await Video.findById(videoId).populate(
    "uploadedBy",
    "_id firstName lastName email username"
  );

  video.views++;
  await video.save();

  if (!video) {
    return next(new AppError("Video not found with this id"));
  }

  res.status(200).json(video);
});

exports.updateVideoInfo = catchAsync(async (req, res, next) => {
  const videoId = req.params.id;
  const { _id } = req.user;
  const { title, description, category, keywords } = req.body;

  const video = await Video.findById(videoId);

  if (!video) {
    return next(new AppError("Video not found", 404));
  }

  const user = await User.findOne({ _id });

  if (!user) {
    return next(new AppError("Invalid Account login or signup first"));
  }

  if (!user.uploadedVideos.includes(videoId)) {
    return next(new AppError("Only owner can update video information."));
  }

  video.title = title;
  video.description = description;
  video.category = category;
  video.keywords = keywords;

  await video.save();

  res.status(200).json({
    status: "success",
    message: "Video information has been updated",
  });
});