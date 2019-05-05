const { db } = require("../util/admin");

exports.getUserServices = (request, response) => {
  db.collection("services")
    .orderBy("createdAt", "desc")
    .where("userName", "==", request.params.name)
    .get()
    .then(data => {
      let services = [];
      data.forEach(doc => {
        services.push({
          serviceId: doc.id,
          name: doc.data().name,
          userName: doc.data().userName,
          usageCount: doc.data().usageCount,
          commentsCount: doc.data().commentsCount
        });
      });
      return response.json(services);
    })
    .catch(error => console.error(error));
};

exports.createService = (request, response) => {
  if (request.body.name.trim() == "") {
    return response.status(400).json({ name: "No debe ser vacio." });
  }

  var newService = {
    name: request.body.name,
    userName: request.user.name,
    createdAt: new Date().toISOString(),
    usageCount: 0,
    commentsCount: 0
  };

  db.collection("services")
    .add(newService)
    .then(doc => {
      newService.serviceId = doc.id;
      return response.json(newService);
    })
    .catch(err => {
      console.error(err);
      return response.statusCode(500).json({ error: "Ups! algo salio mal!" });
    });
};

exports.deleteService = (request, response) => {
  let service = db.doc(`/services/${request.params.serviceId}`);
  service
    .get()
    .then(doc => {
      if (doc.exists && doc.data().userName == request.user.name) {
        service
          .delete()
          .then(() => {
            return response.json({
              message: "Servicio elminado correctamente."
            });
          })
          .catch(err => {
            console.error(err);
            response.status(500).json({ error: "Ups! algo salio mal!" });
          });
      } else {
        return response
          .status(400)
          .json({ error: "No fue posible encontrar el servicio." });
      }
    })
    .catch(err => {
      console.error(err);
      response.status(500).json({ error: "Ups! algo salio mal!" });
    });
};
