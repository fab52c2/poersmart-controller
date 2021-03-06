const actionDevice = {
  action: {},
};


function setReAction(nodeMac, action) {
  actionDevice.action[nodeMac] = action;
}

function setAction(nodeMac, fieldName, fieldValue) {
  let element = actionDevice.action[nodeMac];
  if (!element) {
    element = {};
    actionDevice.action[nodeMac] = element;
  }
  element[fieldName] = fieldValue;
  element.mac = nodeMac;
}
function activateAction(nodeMac, type) {
  const element = actionDevice.action[nodeMac];
  if (element) {
    element.status = true;
    element.type = type;
  }
}
function getAction(nodeMac) {
  const element = actionDevice.action[nodeMac];
  if (element) {
    if (element.status) {
      const action = JSON.parse(JSON.stringify(element));
      delete actionDevice.action[nodeMac];
      return action;
    }
  }
  return null;
}
//
// function readStatus() {
//   return JSON.parse(JSON.stringify(actionDevice));
// }
//
// module.exports.actionDevice = readStatus;
module.exports.setAction = setAction;

module.exports.activateAction = activateAction;
module.exports.getAction = getAction;
module.exports.setReAction = setReAction;

module.exports.MODE_INTEGER = 'modeInt';
module.exports.SCHEDULE = 'schedule';
module.exports.OVERRIDE_TEMPERATURE = 'overrideTemperature';
module.exports.OFF_TEMPERATURE = 'offTemperature';
module.exports.ECO_TEMPERATURE = 'ecoTemperature';
module.exports.MAC = 'mac';
module.exports.DEVICE_CHANGE_TYPE = 'device_type';
module.exports.DEVICE_TEMP_TYPE = 'device_temp_type';
module.exports.TEMP_HOUR = 'temp_hour';
module.exports.TEMP_MINUTE = 'temp_minute';
module.exports.TEMP_ACTION_TYPE = 'temp_action_type';
