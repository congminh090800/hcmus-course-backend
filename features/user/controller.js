const { Admin, User } = require("models");
const bcrypt = require("bcryptjs");
const moment = require("moment");
const jwt = require("jsonwebtoken");
const config = require("config");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

module.exports = {
  signUp: async (req, res, next) => {
    try {
      const { body } = req;
      const email = String(body.email).trim().toLowerCase();
      const user = await User.findOne({ email: email });

      if (user) {
        return res.badRequest(
          "Email is already existed",
          "EMAIL_EXISTS_ALREADY",
          {
            fields: ["email"],
          }
        );
      }

      const salt = bcrypt.genSaltSync(10);
      const hashPassword = bcrypt.hashSync(body.password, salt);
      const newUser = await User({
        email: email,
        password: hashPassword,
        phone: body.phone,
        name: body.name,
        birthDate: body.birthDate
          ? moment(body.birthDate).toDate()
          : moment().toDate(),
        gender: body.gender,
        avatar: body.avatar || "",
      });

      const saved = await newUser.save();

      const transporter = nodemailer.createTransport(config.nodemailerConfig);
      const requestHost = req.get("origin");
      const acceptLink = `${requestHost}/verify-email/${saved._id}`;

      const mailOptions = {
        from: '"HCMUS Course" <course@hcmus.com>', // sender address
        to: email, // list of receivers
        subject: "Verify your email ✔", // Subject line
        html: `<p>Click <a href="${acceptLink}">this link</a> to verify your email</p>`, // html body
      };

      await transporter.sendMail(mailOptions);

      return res.ok(saved._id);
    } catch (err) {
      console.log("sign up failed:", err);
      next(err);
    }
  },
  signIn: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email: email });

      if (!user) {
        return res.badRequest("Email does not exist", "EMAIL_NOT_EXISTS", {
          fields: ["email"],
        });
      }

      if (user.isUnactive) {
        return res.forbidden("Account is not active yet", "UNACTIVE");
      }

      if (user.isBlocked) {
        return res.forbidden("Account is blocked", "BLOCKED");
      }

      const matched = bcrypt.compareSync(password, user.password);
      if (!matched) {
        return res.unauthorized("Unauthorized", "UNAUTHORIZED");
      }

      const accessToken = jwt.sign(
        { id: user._id },
        config.secret.accessToken,
        { expiresIn: config.secret.accessExpiresIn }
      );
      const refreshToken = jwt.sign(
        { id: user._id },
        config.secret.refreshToken,
        { expiresIn: config.secret.expiresIn }
      );

      const updated = await User.findByIdAndUpdate(
        user._id,
        {
          accessToken,
          refreshToken,
        },
        {
          returnDocument: "after",
        }
      );
      updated.password = undefined;
      return res.ok({
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiredAt: Date.now() + Number(config.secret.expiresIn),
        user: updated,
      });
    } catch (err) {
      console.log("sign in failed:", err);
      next(err);
    }
  },
  createAdmin: async (req, res, next) => {
    try {
      const userId = req.body.userId;
      const valid = await User.findOne({
        _id: mongoose.Types.ObjectId(userId),
        deleted_flag: false,
      });
      if (!valid) {
        return res.notFound("User not found", "User not found");
      }

      const validAdmin = await Admin.findOne({
        userId: mongoose.Types.ObjectId(userId),
        deleted_flag: false,
      });
      if (validAdmin) {
        return res.badRequest(
          "This user is already an admin",
          "This user is already an admin"
        );
      }

      const newAdmin = await Admin({
        userId: mongoose.Types.ObjectId(userId),
      });
      const saved = await newAdmin.save();
      return res.ok(saved);
    } catch (err) {
      console.log("create admin failed", err);
      next(err);
    }
  },
  findById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const existed = await User.findOne(
        {
          _id: mongoose.Types.ObjectId(id),
          deleted_flag: false,
        },
        "-password -accessToken -refreshToken"
      );
      if (!existed) {
        return res.notFound("User does not exist", "User does not exist");
      }
      return res.ok(existed);
    } catch (err) {
      console.log("find user by id failed", err);
      next(err);
    }
  },
  findMe: async (req, res, next) => {
    try {
      const { id } = req.user;
      const existed = await User.findById(id, "-password");
      return res.ok(existed);
    } catch (err) {
      console.log("find user by id failed", err);
      next(err);
    }
  },
  refreshToken: async (req, res, next) => {
    try {
      const { refreshToken, userId } = req.body;
      const user = await User.findById(userId);
      if (!user || user.refreshToken != refreshToken) {
        return res.notFound("Invalid refresh token", "Not found");
      }
      jwt.verify(refreshToken, config.secret.refreshToken, (err, result) => {
        if (err) {
          return res.badRequest(err.name, err.name);
        }
        const accessToken = jwt.sign(
          { id: result.id },
          config.secret.accessToken,
          { expiresIn: config.secret.accessExpiresIn }
        );
        User.findByIdAndUpdate(
          result.id,
          {
            accessToken,
          },
          {
            returnDocument: "after",
          },
          (err, doc) => {
            if (err) {
              throw err;
            } else {
              return res.ok(doc.accessToken);
            }
          }
        );
      });
    } catch (err) {
      console.log("refreshToken failed:", err);
      next(err);
    }
  },
  updateProfile: async (req, res, next) => {
    try {
      const { id } = req.user;
      const existed = await User.findById(id);
      if (!existed) {
        return res.badRequest("User does not exist", "Bad Request");
      }
      const updated = await User.findByIdAndUpdate(id, req.body, {
        returnDocument: "after",
      });
      return res.ok(updated);
    } catch (err) {
      console.log("update profile failed:", err);
      next(err);
    }
  },
  setStudentId: async (req, res) => {
    const { studentId } = req.body;
    const userId = req.user.id;

    try {
      const existed = await User.findOne({ studentId: studentId });
      if (existed) {
        return res.badRequest(
          "This Student ID is mapped to another user",
          "Bad Request"
        );
      }

      const user = await User.findById(userId);

      if (user.studentId != null) {
        return res.badRequest(
          "Your account already has Student ID",
          "Bad Request"
        );
      }

      user.studentId = studentId;
      await user.save();

      return res.ok(true);
    } catch (err) {
      console.log(err);
      next(err);
    }
  },
  verifyEmail: async (req, res) => {
    const { userId } = req.body;

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.notFound("User not found", "User not found");
      }
      if (!user.isUnactive) {
        return res.badRequest(
          "This user is already verified",
          "Bad Request"
        );
      }

      user.isUnactive = false;

      await user.save();

      return res.ok(true);
    } catch (err) {
      console.log(err);
      next(err);
    }
  },
};
