//jshint esversion:6
require("dotenv").config();
const express = require("express");
const app = express();
const _ = require("lodash");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const fs = require("fs");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");
var tagsNames = [];
var redirect_page = "/uploadedImages"
var year = new Date().getFullYear(); 
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(
  session({
    secret: "This is a cookie Session.",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

//connect to mongodb
mongoose.connect(
  "mongodb+srv://admin-hanumanjewellers:sKdVX0z3kP100suE@cluster0.d28wl.mongodb.net/ImageData?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true },
  (err) => {
    console.log("connected");
  }
);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "-" + Date.now());
  },
});
const upload = multer({ storage: storage });

const imageSchema = new mongoose.Schema({
  Name: String,
  category: String,
  tags: String,
  image: {
    data: Buffer,
    contentType: String,
  },
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("user", userSchema);
const Image = mongoose.model("image", imageSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

app.get("/uploads", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("upload", {year : year});
  } else {
    redirect_page = "/uploads"
    res.redirect("/login");
  }
});

app.get("/login", function (req, res) {
  res.render("login",{year : year});
});

app.post("/login", function (req, res) {
  email = req.body.username;
  password = req.body.password;
  const user = new User({
    username: email,
    password: password,
  });
  req.logIn(user, function (err) {
    if (err) {
      console.log(err);
      res.redirect("/Login");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect(redirect_page);
      });
    }
  });
  // ///////////////////////////////////////////
  // User.register({ username: req.body.username }, req.body.password, function (
  //   err,
  //   user
  // ) {
  //   if (err) {
  //     res.redirect("/login");
  //     console.log(err);
  //   } else {
  //     passport.authenticate("local")(req, res, function () {
  //       res.redirect("/uploads");
  //     });
  //   }
  // });
});

app.get("/uploadedimages", function (req, res) {
  if (req.isAuthenticated()) {
    Image.find({}, function (err, itemsData) {
      if (err) {
        console.log(err);
        res.send("<h1>Failed to open retry again!</h1>");
      } else {
        if (itemsData) {
          res.render("uploadedImages", { items: itemsData ,year : year });
        }
      }
    });
  } else {
    redirect_page = "/uploadedimages"
    res.redirect("/login");
  }
});

app.post("/uploads", upload.single("image"), function (req, res) {
  const imageObject = {
    Name: req.body.ImgName,
    category: req.body.categoryName,
    tags: _.startCase(req.body.Tagname),
    image: {
      data: fs.readFileSync(
        path.join(__dirname + "/public/uploads/" + req.file.filename)
      ),
      contentType: "image/png",
    },
  };
  Image.create(imageObject, (err, item) => {
    if (err) {
      console.log(err);
    } else {
      // item.save();
      res.redirect("/uploadedImages");
    }
  });
});

app.post("/uploadedImages", function (req, res) {
  Image.deleteOne(
    {
      _id: req.body.id,
    },
    function (err) {
      if (err) {
        console.log(err);
      } else {
        res.redirect("/uploadedImages");
      }
    }
  );
});

app.get("/", function (req, res) {
  res.render("index",{year : year});
});

app.get("/category/:cat", function (req, res) {
  let pageName = _.capitalize(_.lowerCase(req.params.cat));
  Image.find({ category: _.startCase(req.params.cat) }, function (
    err,
    itemsFound
  ) {
    if (err) {
      console.log(err);
    } else {
      tagsNames = [];
      itemsFound.forEach(function (tags) {
        if (!tagsNames.includes(tags.tags)) {
          tagsNames.push(tags.tags);
        }
      });
      res.render("category", {
        items: itemsFound,
        year : year,
        pageName: pageName,
        tagNames: tagsNames,
        address: _.startCase(req.params.cat),
        pageAddressLink: "",
      });
    }
  });
});

app.get("/category/tags/:cat/:tags", function (req, res) {
  Image.find(
    {
      category: _.startCase(req.params.cat),
    },
    function (err, itemsFound) {
      if (err) {
        console.log(err);
      } else {
        tagsNames = [];
        itemsFound.forEach(function (tags) {
          if (!tagsNames.includes(_.startCase(tags.tags))) {
            if (_.kebabCase(tags.tags) !== _.kebabCase(req.params.tags)) {
              tagsNames.push(_.startCase(tags.tags));
            }
          }
        });
      }
    }
  );
  Image.find(
    {
      category: _.startCase(req.params.cat),
      tags: _.startCase(req.params.tags),
    },
    function (err, itemsFound) {
      if (err) {
        console.log(err);
      } else {
        res.render("category", {
          items: itemsFound,
          year : year,
          pageName: _.startCase(req.params.tags),
          tagNames: tagsNames,
          address: _.startCase(req.params.cat),
          pageAddressLink: "category/" + _.kebabCase(req.params.cat),
        });
      }
    }
  );
});

app.get("/features", function (req, res) {
  res.render("features",{year : year});
});
app.get("/contact", function (req, res) {
  res.render("contact",{year : year});
});
app.listen(process.env.PORT || 3000, function () {
  console.log("Server Started at 3000 port");
});
