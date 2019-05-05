const serviceStatuses = {
  PENDING: "Reservación pendiente de aprobación.",
  COMFIRMED: "Reservación confirmada.",
  REJECTED: "Reservación rechazada."
};

exports.getServiceStatusMessage = status => {
  switch (status) {
    case 1:
      return serviceStatuses.PENDING;
    case 2:
      return serviceStatuses.COMFIRMED;
    case 3:
      return serviceStatuses.REJECTED;
    default:
      return serviceStatuses.PENDING;
  }
};
