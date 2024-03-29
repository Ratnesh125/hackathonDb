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
const courseSuggestedSchema = new Schema({
  courseName: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
});
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
  },
  { timestamps: true },
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
    },
    imageLink: {
      type: String,
      trim: true,
    },
    userID: { type: String },
  },
  { timestamps: true },
  { versionKey: false },
  { strict: false }
);

const VideoSchema = Schema(
  {
    UserID:{type:String},
    CourseID: { type: String },
    VideoTitle: { type: String },
    VideoDesc: { type: String },
    VideoLink: { type: String },
     Status: {
      type: String,
      default: "Pending",
    },
  },
  { timestamps: true },
  { versionKey: false },
  { strict: false }
);

const NotesSchema = Schema(
  {
    UserID:{type:String},
    CourseID: { type: String },
    NotesTitle: { type: String },
    NotesDesc: { type: String },
    NotesLink: { type: String },
     Status: {
      type: String,
      default: "Pending",
    },
  },
  { timestamps: true },
  { versionKey: false },
  { strict: false }
);

const ProjectSchema = Schema(
  {
    UserID:{type:String},
    CourseID: { type: String },
    ProjectTitle: { type: String },
    ProjectDesc: { type: String },
    GitRepoLink: { type: String },
  },
  { timestamps: true },
  { versionKey: false },
  { strict: false }
);

const DocumentationSchema = Schema(
  {
    UserID:{type:String},
    CourseID: { type: String },
    subTitle: { type: String },
    subContent: { type: String },
    ContentID: { type: String },
    Version:{type: Number, default:1},
    Status: {
      type: String,
      default: "Pending",
    },
  },
  { timestamps: true },
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

const messageSchema = new Schema(
  {
    sender: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
  { versionKey: false },
  { strict: false }
);

const groupChatSchema = new Schema(
  {
    groupId: {
      type: Number,
    },
    groupName: {
      type: String,
      required: true,
    },
    members: [
      {
        type: String, // Assuming member usernames as strings
      },
    ],
    messages: [messageSchema],
  },
  { timestamps: true },
  { versionKey: false },
  { strict: false }
);

const Group = model("groupchat", groupChatSchema);
const Course = model("Course", courseSchema);
const User = model("Users", userSchema);
const EnrolledCourse = model("EnrolledCourses", EnrolledCourseschema);
const Topic = model("Topic", topicSchema);
const Videos = model("Videos", VideoSchema);
const Notes = model("Notes", NotesSchema);
const Projects = model("Projects", ProjectSchema);
const Documentation = model("Documentation", DocumentationSchema);
const CourseSuggested = model('CourseSuggested', courseSuggestedSchema);

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
  upload.single("imageLink"),
  async (req, res) => {
    try {
      const { title, description, lvlOfDiff, userID } = req.body;

      const courseInUse = await isCourseAlreadyInUse(title);
      if (courseInUse) {
        return res.send({ message: "Course already Exist", success: false });
      }
      const imageFile = req.file;      

      const imageBase64String = imageFile.buffer.toString("base64");
      let constructedString =
        "data:" + imageFile.mimetype + ";" + "base64," + imageBase64String;
      const imageResult = await cloudinary.uploader.upload(constructedString, {
        folder: "Techbuddies",
        public_id: "Course_" + Date.now() + "_image",
      });
      
      const imageLink = imageResult.secure_url;

      const addCourse = new Course({
        title,
        description,
        lvlOfDiff,
        imageLink,
        userID,
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

      res.send({ message: "Course Can't Added", success: false });
    }
  }
);

app.post("/auth/addVideo", upload.single("VideoLink"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .send({ message: "No file uploaded", success: false });
    }

    const { UserID,VideoTitle, VideoDesc, CourseID } = req.body;

    const videoFile = req.file;

    if (!videoFile.buffer) {
      return res
        .status(400)
        .send({ message: "File buffer is missing", success: false });
    }

    const videoBase64String = videoFile.buffer.toString("base64");
    const constructedVideoString =
      "data:" + videoFile.mimetype + ";base64," + videoBase64String;

    const videoResult = await cloudinary.uploader.upload(
      constructedVideoString,
      {
        resource_type: "video",
        folder: "Techbuddies",
        public_id: "Course_" + Date.now() + "_video",
      }
    );

    const VideoLink = videoResult.secure_url;
    console.log(VideoLink);
    const addVideos = new Videos({
      UserID,
      VideoTitle,
      VideoDesc,
      CourseID,
      VideoLink,
    });

    const savedVideo = await addVideos.save();

    res
      .status(200)
      .send({ message: "Video Added", data: savedVideo, success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "An error occurred", success: false });
  }
});

app.post("/auth/addNotes", upload.single("NotesLink"), async (req, res) => {
  try {
    const {UserID, NotesTitle, NotesDesc, CourseID } = req.body;

    const notesLink = req.file;
    console.log(notesLink);
    if (!notesLink) {
      return res.status(400).send("Notes files are required.");
    }

    const videoBase64String = notesLink.buffer.toString("base64");
    let constructedVideoString =
      "data:" + notesLink.mimetype + ";" + "base64," + videoBase64String;

    const videoResult = await cloudinary.uploader.upload(
      constructedVideoString,
      {
        folder: "Techbuddies",
        public_id: "Course_" + Date.now() + "_video",
      }
    );
    const NotesLink = videoResult.secure_url;

    const addNotes = new Notes({
      UserID,
      NotesTitle,
      NotesDesc,
      CourseID,
      NotesLink,
    });
addNotes.save()
      .then((item) => {
        console.log(item);
        res.send({ message: "Notes Added", data: item, success: true });
      })
      .catch((err) => {
        console.log(err);
        res.send({ message: "Please Try Again", success: false });
      });
  } catch (err) {
    res.send({ message: "Notes Can't Added", success: false });
  }
});
app.post("/auth/addProject", async (req, res) => {
  try {
    const { UserID, ProjectTitle, ProjectDesc, GitRepoLink, CourseID } = req.body;
console.log(req.body);
    const addProject = new Projects({
      UserID,
      ProjectTitle,
      ProjectDesc,
      GitRepoLink,
      CourseID,
    });
    addProject
      .save()
      .then((item) => {
        console.log(item);
        res.send({ message: "Project Added", data: item, success: true });
      })
      .catch((err) => {
        console.log(err);
        res.send({ message: "Please Try Again", success: false });
      });
  } catch (err) {
    res.send({ message: "Project Can't Added", success: false });
  }
});

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

app.post("/creategroup", async (req, res) => {
  try {
    const { groupName, members } = req.body;
    // const groupName = "FRIENDS"
    // const members = ["ratnesh", "me", "anuj"]
    const groupId = Date.now();

    // Validate if required fields are present
    if (
      !groupName ||
      !members ||
      !Array.isArray(members) ||
      members.length === 0
    ) {
      return res
        .status(400)
        .send({ error: "Invalid request. Check your input data." });
    }

    // Create a new group
    const newGroup = new Group({
      groupId,
      groupName,
      members,
      messages: [], // You may initialize the messages array here or leave it empty
    });

    // Save the new group to the database
    const savedGroup = await newGroup.save();

    res
      .status(201)
      .send({ message: "Group created successfully", group: savedGroup });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.post("/sendmessage", async (req, res) => {
  try {
    const { groupId, sender, content } = req.body;

    if (!groupId || !sender || !content) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const groupChat = await Group.findOne({ groupId });

    if (!groupChat) {
      return res.status(404).send({ error: "Group not found" });
    }

    const newMessage = {
      sender: sender,
      content: content,
      timestamp: Date.now(),
    };

    groupChat.messages.push(newMessage);
    await groupChat.save();

    res.send({ message: "Message sent successfully" });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});
app.get("/groups/:groupId", async (req, res) => {
  try {
    const groupId = req.params.groupId;
    if (!groupId) {
      return res.status(400).json({ error: 'Missing group ID' });
    }
    const group = await Group.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.status(200).json({ group });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/groupchats", async (req, res) => {
  try {
    const groups = await Group.find({});
    console.log(groups);

    if (groups.length > 0) {
      res.send(groups);
    } else {
      res.status(404).send({ message: "No topics found" });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.post("/auth/addDoc", async (req, res) => {
  const { UserID,CourseID, subTitle, subContent, ContentID } = req.body;

  const Documentations = new Documentation({
    UserID,CourseID, subTitle, subContent, ContentID
  });

  Documentations
    .save()
    .then(() => {
      res.send({ message: "Documentation added successfully" });
    })
    .catch((error) => {
      res.status(500).send({ error: error.message });
    });
});

app.post("/auth/updateDoc", async (req, res) => {
  try {
    let { UserID, CourseID, subTitle, subContent, ContentID, Version } = req.body;
    Version = parseInt(Version) + 1; // Increment Version

    // Using the mongoose model to find and update the document
    let updatedDoc = await Documentation.findByIdAndUpdate(CourseID,
      {
        UserID: UserID,
        CourseID: CourseID,
        subTitle: subTitle,
        subContent: subContent,
        ContentID: ContentID,
        Version: Version
      },
      { new: true } // To return the updated document
    );

    res.status(200).json({ message: "Documentation Status Updated", updatedDoc });
  } catch (error) {
    console.error("Error in updateAcceptOrder:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


app.get("/auth/getDoc/:id", async (req, res) => {
        const { id } = req.params;
Documentation.find({ CourseID: id, Status: { $eq: "Accepted" }}).sort({ ContentID: 1 }).then((resp) => {
      res.send(resp);
    })
    .catch((error) => {
      res.status(500).send({ error: error.message });
    });
});
app.post("/UpdateStatus", (req, res) => {
  const { id, Statusmsg } = req.body;
  try {
    Documentation.updateOne({ _id: id }, { Status: Statusmsg })
      .then((item) => {
        res.send({ message: "Update Successfully" });
      })
      .catch((err) => {
        res.send({ message: "Can't Update Product" });
      });
  } catch {
    res.send("db error");
  }
});

app.post("/UpdateStatus/video", (req, res) => {
  const { id, Statusmsg } = req.body;
  try {
    Videos.updateOne({ _id: id }, { Status: Statusmsg })
      .then((item) => {
        res.send({ message: "Update Successfully" });
      })
      .catch((err) => {
        res.send({ message: "Can't Update Product" });
      });
  } catch {
    res.send("db error");
  }
});

app.post("/UpdateStatus/note", (req, res) => {
  const { id, Statusmsg } = req.body;
  try {
    Notes.updateOne({ _id: id }, { Status: Statusmsg })
      .then((item) => {
        res.send({ message: "Update Successfully" });
      })
      .catch((err) => {
        res.send({ message: "Can't Update Product" });
      });
  } catch {
    res.send("db error");
  }
});

app.get("/auth/getDocs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      Documentation.find({ UserID: id})
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

app.get("/auth/getVideo/:id", async (req, res) => {
    try {
      const { id } = req.params;
      Videos.find({ UserID: id })
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
app.get("/auth/getVideos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      Videos.find({ CourseID: id,Status: { $eq: "Accepted" } })
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

app.get("/auth/getNote/:id", async (req, res) => {
    try {
      const { id } = req.params;
      Notes.find({ UserID: id })
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
app.get("/auth/getNotes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      Notes.find({ CourseID: id ,Status: { $eq: "Accepted" }})
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

app.get("/auth/getProject/:id", async (req, res) => {
    try {
      const { id } = req.params;
      Projects.find({ UserID: id })
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
app.get("/auth/getProjects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      Projects.find({ CourseID: id })
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
app.post('/suggestcourse', async (req, res) => {
  const { courseName, description } = req.body;
  if (!courseName || !description) {
    return res.status(400).json({ error: 'Both courseName and description are required.' });
  }
  const newCourseSuggested = new CourseSuggested({
    courseName,
    description,
  });
  const savedCourse = await newCourseSuggested.save();
  res.status(201).json(savedCourse);
});
app.listen(PORT, function () {
  console.log("Backend is running on Port: " + PORT);
});
