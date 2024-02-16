import express from "express";
import { connect, model, Schema } from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { memoryStorage } from "multer";
dotenv.config();

const PORT = process.env.PORT || 3001;
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "x-access-token, Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

try {
  connect(process.env.MONGODB_URI)
    .then(console.log("DB Connected"))
    .catch((err) => console.log("Error in url: ", err));
} catch (error) {
  console.log("DB not Connected");
}

const userSchema = new Schema(
  {
    Username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    Email: {
      type: String,
      required: true,
      unique: true,
      match: /^([\w-\.]+)@([\w-\.]+)\.([a-zA-Z]{2,5})$/,
      trim: true,
    },
    Password: {
      type: String,
      required: true,
    },
    FirstName: { type: String },
    LastName: { type: String },
  },
  {
    timestamps: true,
  },
  { versionKey: false },
  { strict: false }
);

const topicSchema = new Schema(
  {
    TopicId: {
      type: Number,
      required: true,
    },
    topicTitle: {
      type: String,
      required: true,
      trim: true,
    },
    subTopicTitle: {
      type: String,
      required: true,
      trim: true,
    },
    subTopicContent: {
      type: String,
    },
    date: {
      type: String,
    },
  },
  { versionKey: false },
  { strict: false }
);

const courseSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    lvlOfDiff: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    imageLink: {
      type: String,
      trim: true,
    },
    videoLink: {
      type: String,
      trim: true,
    },
    published: {
      type: Boolean,
      default: false,
    },
    userId: { type: String},
  },
  {timestamps: true},
  { versionKey: false },
  { strict: false }
);

const EnrolledCourseschema = Schema(
  {
    courseID: { type: String },
    userID: { type: String, required: true },
  },
  { versionKey: false },
  { strict: false }
);

const Course = model("Course", courseSchema);
const User = model("Users", userSchema);
const EnrolledCourse = model("EnrolledCourses", EnrolledCourseschema);
const Topic = model("Topic", topicSchema);

app.post("/auth/login", (req, res) => {
  try {
    const { Data, Password } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usernameRegex = /^[a-zA-Z0-9_]+$/;

    let dataType, query;

    if (emailRegex.test(Data)) {
      dataType = "Email";
      query = { Email: Data };
    } else if (usernameRegex.test(Data)) {
      dataType = "Username";
      query = { Username: Data };
    }

    User.findOne({ $and: [query, { Password }] })
      .then((item) => {
        if (item !== null) {
          res.send({
            message: "Login Successfully",
            data: item,
            success: true,
          });
        } else {
          res.send({
            message: "Password Incorrect",
            success: false,
          });
        }
      })
      .catch((err) => {
        res.send({ message: "Please Try Again", success: false });
      });
  } catch {
    res.send({ message: "Customer Login Failed", success: false });
  }
});

const isEmailAlreadyInUse = async (email) => {
  const existingUser = await User.findOne({ Email: email });
  return !!existingUser;
};
const isUsernameAlreadyInUse = async (Username) => {
  const existingUser = await User.findOne({ Username: Username });
  return !!existingUser;
};

app.post("/auth/register", async (req, res) => {
  try {
    const { FirstName, LastName, Username, Email, Password } = req.body;

    const emailInUse = await isEmailAlreadyInUse(Email);
    if (emailInUse) {
      return res.send({ message: "Email already in use", success: false });
    }
    const UsernameInUse = await isUsernameAlreadyInUse(Username);
    if (UsernameInUse) {
      return res.send({ message: "Username already in use", success: false });
    }

    const users = new User({
      FirstName,
      LastName,
      Username,
      Email,
      Password,
    });

    users
      .save()
      .then((item) => {
        res.send({ message: "User Registered", data: item, success: true });
      })
      .catch((err) => {
        console.log(err);
        res.send({ message: "Try Again", success: false });
      });
  } catch {
    res.send({ message: "Register Failed", success: false });
  }
});

const isCourseAlreadyInUse = async (title) => {
  const existingUser = await Course.findOne({ title });
  return !!existingUser;
};

cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
});

const storage = memoryStorage();
const upload = multer({ storage: storage });

app.post(
  "/auth/addCourse",
  upload.fields([
    { name: "imageLink", maxCount: 1 },
    { name: "videoLink", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!req.files || !req.files.imageLink || !req.files.videoLink) {
        return res.status(400).send("Both image and video files are required.");
      }
      const { title, description, lvlOfDiff, published, userId } = req.body;

      const courseInUse = await isCourseAlreadyInUse(title);
      if (courseInUse) {
        return res.send({ message: "Course already Exist", success: false });
      }

      const imageFile = req.files.imageLink[0]; // Extract image file from req.files
      const videoFile = req.files.videoLink[0]; // Extract video file from req.files
      if (!imageFile || !videoFile) {
        return res.status(400).send("Both image and video files are required.");
      }

      const imageBase64String = imageFile.buffer.toString("base64");
      let constructedString = "data:" + imageFile.mimetype + ";" + "base64," + imageBase64String;
      const imageResult = await cloudinary.uploader.upload(
      constructedString,{
          folder: "Techbuddies",
          public_id: "Course_"+Date.now()+"_image",
        }
      );
      const imageLink = imageResult.secure_url;

      const videoBase64String = videoFile.buffer.toString("base64");
      let constructedVideoString = '"data:' + videoFile.mimetype + ';base64,' + videoBase64String + '"';
      const videoResult = await cloudinary.uploader.upload(
        constructedVideoString,
        {
          resource_type: "video",
          folder: "Techbuddies",
          public_id: "Course_"+Date.now()+"_video",
        }
      );
      const videoLink = videoResult.secure_url;

      const addCourse = new Course({
        title,
        description,
        lvlOfDiff,
        imageLink,
        videoLink,
        published,
        userId,
      });

      addCourse
        .save()
        .then((item) => {
          res.send({ message: "Course Added", data: item, success: true });
        })
        .catch((err) => {
          console.log(err);
          res.send({ message: "Please Try Again", success: false });
        });
    } catch (err) {
      console.log(err);
      res.send({ message: "Course Can't Added", success: false });
    }
  }
);

const isEnrolledCourseAlreadyInUse = async (id, userID) => {
  const existingUser = await EnrolledCourse.findOne({
    courseID: id,
    userID: userID,
  });
  return !!existingUser;
};

app.post("/auth/AddEnrolledCourse", async (req, res) => {
  try {
    const { id, userID } = req.body;

    const courseInUse = await isEnrolledCourseAlreadyInUse(id, userID);
    if (courseInUse) {
      return res.send({ message: "Course already Enrolled", success: true });
    }

    const addCourse = new EnrolledCourse({
      courseID: id,
      userID: userID,
    });

    addCourse
      .save()
      .then((item) => {
        res.send({ message: "Course Enrolled", data: item, success: true });
      })
      .catch((err) => {
        res.send({ message: "Please Try Again", success: false });
      });
  } catch (err) {
    res.send({ message: "Course Can't Added", success: false });
  }
});

app.get("/auth/getAllCourse", (req, res) => {
  try {
    Course.find({})
      .then((item) => {
        res.send({ data: item });
      })
      .catch((err) => {
        res.send("Can't Find Course");
      });
  } catch {
    res.send("db error");
  }
});

app.get("/auth/getCourse/:id", (req, res) => {
  try {
    const { id } = req.params;
    Course.findOne({ _id: id })
      .then((item) => {
        res.send({ data: item });
      })
      .catch((err) => {
        res.send("Can't Find Course");
      });
  } catch {
    res.send("db error");
  }
});

app.get("/auth/getAllCourse/:id", (req, res) => {
  try {
    const { id } = req.params;
    Course.find({ userId: id })
      .then((item) => {
        res.send({ data: item });
      })
      .catch((err) => {
        res.send("Can't Find Course");
      });
  } catch {
    res.send("db error");
  }
});

app.get("/auth/getEnrolledCourse/:id", (req, res) => {
  try {
    const { id } = req.params;
    EnrolledCourse.find({ userID: id })
      .then((item) => {
        res.send({ data: item });
      })
      .catch((err) => {
        res.send("Can't Find Course");
      });
  } catch {
    res.send("db error");
  }
});

// app.delete("/auth/DeleteCourse/:id", (req, res) => {
//   try {
//     const { id } = req.params;
//     Course.deleteOne({ _id: id })
//       .then((item) => {
//         res.send({ data: item });
//       })
//       .catch((err) => {
//         res.send("Can't Find Delete");
//       });
//   } catch {
//     res.send("db error");
//   }
// });

/* Title   */
app.post("/auth/createtopics", async (req, res) => {
  const { topicTitle, subTopicTitle, subTopicContent } = req.body;

  const newTopic = new Topic({
    id: Date.now(),
    topicTitle,
    subTopicTitle,
    subTopicContent,
    date: Date.now(),
  });
  newTopic
    .save()
    .then(() => {
      res.json({ message: "topic added successfully" });
    })
    .catch((error) => {
      res.status(500).json({ error: error.message });
    });
});

app.get("/auth/topics", async (req, res) => {
  try {
    const topics = await Topic.find().distinct("topicTitle");

    if (topics.length > 0) {
      res.send({ Data: topics });
    } else {
      res.status(404).send({ message: "No topics found" });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.get("/auth/topics/:id", async (req, res) => {
  try {
    const TopicId = req.params.id;
    if (!TopicId) {
      return res
        .status(400)
        .send({ error: "Missing required parameter: topicTitle" });
    }
    const subtopics = await Topic.find({ TopicId }).sort({ id: 1 });
    res.send({ Data: subtopics });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.listen(PORT, function () {
  console.log("Backend is running on Port: "+PORT);
});
