const functions = require("firebase-functions");
const app = require("express")();
const { db } = require("./util/admin");

const {
  signUp,
  login,
  uploadImage,
  addUserDetails,
  getUserDetails,
  getAuthenticatedUser
} = require("./handlers/users");

const {
  createService,
  getUserServices,
  deleteService
} = require("./handlers/services");

const {
  createReservation,
  getAllUserReservations,
  updateReservation,
  deleteReservation
} = require("./handlers/reservations");

const { FBAuth } = require("./util/fbAuth");

// User Routes
app.get("/user", FBAuth, getAuthenticatedUser);
app.post("/signup", signUp);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user/:handle", getUserDetails);

// Services Routes
app.get("/services/:name", getUserServices);
app.post("/service", FBAuth, createService);
app.delete("/service/:serviceId", FBAuth, deleteService);

// Reservations Routes
app.get("/reservations/:userName", getAllUserReservations);
app.put("/reservation/:reservationId", updateReservation);
app.post("/reservation", createReservation);
app.delete("/reservation/:reservationId", deleteReservation);

exports.api = functions.https.onRequest(app);
