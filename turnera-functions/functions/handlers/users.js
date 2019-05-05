const { db, admin } = require("../util/admin");
const config = require("../util/config");
const firebase = require("firebase");
const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails
} = require("../util/validators");

firebase.initializeApp(config);

exports.signUp = (request, response) => {
  const newUser = {
    email: request.body.email,
    password: request.body.password,
    confirmPassword: request.body.confirmPassword,
    name: request.body.name
  };

  const { valid, errors } = validateSignupData(newUser);
  if (!valid) return response.status(400).json(errors);

  const noImg = "no-img.png";

  let token, userId;
  db.doc(`/users/${newUser.name}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        return response.status(400).json({
          name: `Ya existe un usuario con el nombre ${newUser.name}.`
        });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then(data => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then(idToken => {
      token = idToken;
      const userCredential = {
        name: newUser.name,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `${config.storageBucketUrl}/v0/b/${
          config.storageBucket
        }/o/${noImg}?alt=media`,
        userId: userId
      };
      return db.doc(`/users/${newUser.name}`).set(userCredential);
    })
    .then(() => {
      return response.status(201).json({ token });
    })
    .catch(error => {
      console.error(error);
      if (error.code === "auth/email-already-in-use") {
        return response.status(400).json({ email: "El email ya esta en uso." });
      } else {
        return response
          .status(500)
          .json({ general: "ups! algo salio mal intenta de nuevo mas tarde." });
      }
    });
};

exports.login = (request, response) => {
  const user = {
    email: request.body.email,
    password: request.body.password
  };

  const { valid, errors } = validateLoginData(user);
  if (!valid) return response.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return response.json({ token });
    })
    .catch(error => {
      console.error(error);
      return response
        .status(403)
        .json({ general: "El email o la contraseña no son correctos." });
    });
};

// add user details
exports.addUserDetails = (request, response) => {
  let userDetails = reduceUserDetails(request.body);

  db.doc(`/users/${request.user.name}`)
    .update(userDetails)
    .then(() => {
      return response.json({ message: "Perfil actualizado correctamente." });
    })
    .catch(error => {
      console.error(error);
      return response.status(500).json({ error: error.code });
    });
};

// get any users detais
exports.getUserDetails = (request, response) => {
  let userData = {};
  db.doc(`/users/${request.params.name}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        userData.user = doc.data();
        return db
          .collection("services")
          .where("userName", "==", request.params.name)
          .orderBy("createdAt", "desc")
          .get();
      }

      return response.status(404).json({ error: "Usuario no encontrado." });
    })
    .then(data => {
      userData.services = [];
      data.forEach(doc => {
        userData.services.push({
          serviceId: doc.id,
          name: doc.data().name,
          userName: doc.data().userName,
          usageCount: doc.data().usageCount,
          commentCount: doc.data().commentCount
        });
      });
      return response.json(userData);
    })
    .catch(error => {
      console.error(error);
      return response.status(500).json({ error: error.code });
    });
};

exports.markNotificationsRead = (request, response) => {
  let batch = db.batch();
  request.body.forEach(notificationId => {
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true });
  });
  batch
    .commit()
    .then(() => {
      return response.json({ message: "Notifications marked read." });
    })
    .catch(error => {
      console.error(error);
      return response.status(500).json({ error: error.code });
    });
};

// get authenticated user
exports.getAuthenticatedUser = (request, response) => {
  let userData = {};
  db.doc(`/users/${request.user.name}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return response.json(userData);
      } else {
        return response.status(404).json({ error: "Usuario no encontrado." });
      }
    })
    .catch(error => {
      console.error(error);
      return response.status(500).json({ error: error.code });
    });
};

exports.uploadImage = (request, response) => {
  const Busboy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new Busboy({ headers: request.headers });
  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    //console.log(fieldname,filename, mimetype);
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return response
        .status(400)
        .json({ message: "Debe ser una imagen en formato jpeg o png." });
    }

    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    imageFileName = `${Math.round(Math.random() * 1000000)}.${imageExtension}`;
    const filePath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filePath, mimetype };
    file.pipe(fs.createWriteStream(filePath));
  });

  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filePath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype
          }
        }
      })
      .then(() => {
        const imageUrl = `https:firebasestorage.googleapis.com/v0/b/${
          config.storageBucket
        }/o/${imageFileName}?alt=media`;
        return db.doc(`/users/${request.user.name}`).update({ imageUrl });
      })
      .then(() => {
        return response.json({ message: "Imagen actualizada correctamente." });
      })
      .catch(error => {
        console.error(error);
        return response.status(500).json({ error: error.code });
      });
  });
  busboy.end(request.rawBody);
};
