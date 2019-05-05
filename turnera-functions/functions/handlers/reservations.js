const { db } = require("../util/admin");
const currentWeekNumber = require("current-week-number");
const { getServiceStatusMessage } = require("../util/serviceStatuses");
/*
    ##Service status
    1 -> pending
    2 -> confirmed
    3 -> rejected
*/
//TODO: validate if there's other reservation to the same service at the same time
//Note: 24 time formatt

exports.getAllUserReservations = async (request, response) => {
  try {
    const reservations = await getAllUserReservations(request);
    return response.json(reservations);
  } catch (err) {
    console.error(err);
    return response.status(500).json({
      error: "Ups! algo salio mal!"
    });
  }
};

async function getAllUserReservations(request) {
  let reservations = [];
  let reservationRef = await db
    .collection("reservations")
    .orderBy("createdAt", "desc")
    .where("userName", "==", request.params.userName)
    .get();

  for (doc of reservationRef.docs) {
    let service = await db.doc(`/services/${doc.data().serviceId}`).get();
    reservations.push({
      reservationId: doc.id,
      personName: doc.data().personName,
      userName: doc.data().userName,
      serviceId: doc.data().serviceId,
      serviceName: service.data().name,
      weekNumber: doc.data().weekNumber,
      day: doc.data().day,
      month: doc.data().month,
      year: doc.data().year,
      hour: doc.data().hour,
      status: doc.data().status,
      statusMessage: getServiceStatusMessage(doc.data().status),
      createdAt: doc.data().createdAt
    });
  }

  return reservations;
}

exports.createReservation = (request, response) => {
  if (request.body.personName.trim() == "") {
    return response.status(400).json({ name: "Por favor ingresa tú nombre." });
  }

  const newReservation = {
    personName: request.body.personName,
    userName: request.body.userName,
    serviceId: request.body.serviceId,
    weekNumber: currentWeekNumber(
      `${request.body.month}/${request.body.day}/${request.body.year}`
    ),
    day: request.body.day,
    month: request.body.month,
    year: request.body.year,
    hour: request.body.hour,
    status: 1,
    createdAt: new Date().toISOString()
  };

  const userRef = db.doc(`/users/${newReservation.userName}`);
  userRef
    .get()
    .then(user => {
      if (user.exists) {
        const serviceRef = db.doc(`/services/${newReservation.serviceId}`);
        serviceRef.get().then(service => {
          if (service.exists) {
            db.collection("reservations")
              .add(newReservation)
              .then(doc => {
                newReservation.reservationId = doc.id;
                newReservation.status = "Pendiente de aprobación.";
                newReservation.serviceName = service.data().name;
                return response.json(newReservation);
              })
              .catch(err => {
                console.error(err);
                return response.statusCode(500).json({
                  error: "Ups! algo salio mal! no fue posible crear la reserva."
                });
              });
          } else {
            return response
              .status(400)
              .json({ error: "No fue posible encontrar el servicio." });
          }
        });
      } else {
        return response
          .status(400)
          .json({ error: "No fue posible encontrar el usuario." });
      }
    })
    .catch(err => {
      console.error(err);
      return response.statusCode(500).json({ error: "Ups! algo salio mal!" });
    });
};

//TODO: just will be able yo update the name and the state
// to change the date they will have to delete it and create it again
exports.updateReservation = (request, response) => {
  let reservation = request.body;
  reservation.updatedAt = new Date().toISOString();
  db.doc(`/reservations/${request.params.reservationId}`)
    .update(reservation)
    .then(() => {
      return response.json({
        message: "Reservación actualizada correctamente."
      });
    })
    .catch(error => {
      console.error(error);
      return response.status(500).json({ error: error.code });
    });
};

exports.deleteReservation = (request, response) => {
  let reservation = db.doc(`/reservations/${request.params.reservationId}`);
  reservation
    .get()
    .then(doc => {
      if (doc.exists) {
        reservation.delete().then(() => {
          return response.json({
            message: "Reservacion eliminada correctamente."
          });
        });
      } else {
        return response
          .status(400)
          .json({ error: "No fue posible encontrar la reservación." });
      }
    })
    .catch(err => {
      console.error(err);
      response.status(500).json({ error: "Ups! algo salio mal!" });
    });
};
