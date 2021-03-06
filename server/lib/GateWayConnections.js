const {
  int8ArrayToHex,
  hexToUint8Array,
  shiftRight,
  arrayToInt16,
  arrayToInt8,
  int16ToUint8Array,
  int8ToUint8Array,
  modes,
} = require('./Utils');
const { constants } = require('./constant');
const { setField } = require('./DeviceStatus');
const { addNode, schedulerToHex } = require('./DeviceStatus');
const { addNodeMode, currentStatus } = require('./DeviceStatus');
const {
  MODE_INTEGER,
  OVERRIDE_TEMPERATURE,
  OFF_TEMPERATURE,
  ECO_TEMPERATURE,
  DEVICE_CHANGE_TYPE,
  TEMP_HOUR,
  TEMP_MINUTE,
  TEMP_ACTION_TYPE,
  SCHEDULE,
  setReAction,
} = require('./ActionDevice');

function readEventNumber(message) {
  const numberHex = message.slice(0, 3);
  return arrayToInt16(numberHex);
}

function readMac(message) {
  const macHex = message.slice(0, 6);
  return int8ArrayToHex(macHex);
}

function readModeInt(message) {
  const mode = message.slice(0, 1);
  return arrayToInt8(mode);
}

function readTempHour(message) {
  const hour = message.slice(0, 1);
  return arrayToInt8(hour);
}

function readTempMinute(message) {
  const minute = message.slice(0, 1);
  return arrayToInt8(minute);
}

function readMode(message) {
  const i = readModeInt(message);
  return modes[i];
}

function readSoftVersion(message) {
  const softHex = message.slice(0, 2);
  return arrayToInt16(softHex);
}

function readTemp(message) {
  const softHex = message.slice(0, 2);
  return arrayToInt16(softHex) / 9;
}

function readWiFI(message) {
  const wifiHex = message.slice(0, 1);
  return arrayToInt8(wifiHex);
}


function readBattery(message) {
  const wifiHex = message.slice(0, 1);
  return arrayToInt8(wifiHex);
}

function readHumidity(message) {
  const wifiHex = message.slice(0, 1);
  return arrayToInt8(wifiHex);
}

function readActuatorStatus(message) {
  const actuatorStatusHex = message.slice(0, 1);
  const actuatorStatus = arrayToInt8(actuatorStatusHex);
  return (1 & actuatorStatus) === 1; // eslint-disable-line no-bitwise
}

function readCountNodes(message) {
  const countHex = message.slice(0, 1);
  return arrayToInt8(countHex);
}

function readHardVersion(message) {
  const hardHex = message.slice(0, 1);
  return (hardHex[0] | 240) - 240; // eslint-disable-line no-bitwise
}

function generateUniqId() {
  const date = new Date();
  const seconds = date.getSeconds();
  const minutes = date.getMinutes();
  const hour = date.getHours();
  const dayOfWeek = date.getDay();
  return (hour + minutes + seconds)
  * (dayOfWeek + 1); // eslint-disable-line no-mixed-operators
}

function readNode(message) {
  const mac = readMac(message);
  let updatedMessage = shiftRight(message, 8);
  const hardVersion = readHardVersion(updatedMessage);
  updatedMessage = shiftRight(updatedMessage, 1);
  const battery = readBattery(updatedMessage);
  updatedMessage = shiftRight(updatedMessage, 1);
  const humidity = readHumidity(updatedMessage);
  updatedMessage = shiftRight(updatedMessage, 3);
  const actuatorStatus = readActuatorStatus(updatedMessage);
  updatedMessage = shiftRight(updatedMessage, 3);
  const curTemp = readTemp(updatedMessage);
  updatedMessage = shiftRight(updatedMessage, 2);
  // const overrideTemperature = readTemp(updatedMessage);
  updatedMessage = shiftRight(updatedMessage, 2);
  const softVersion = readSoftVersion(updatedMessage);
  updatedMessage = shiftRight(updatedMessage, 4);
  const SptTemprature = readTemp(updatedMessage);
  return {
    mac,
    hardVersion,
    battery,
    humidity,
    curTemp,
    // overrideTemperature,
    softVersion,
    actuatorStatus,
    SptTemprature,
  };
}

function readNodes(mac, message, count) {
  const nodes = [];
  let updatedMessage = message;
  for (let i = 0; i < count; i++) { // eslint-disable-line no-plusplus
    const node = readNode(updatedMessage);
    nodes.push(node);
    addNode(mac, node);
    updatedMessage = shiftRight(updatedMessage, 26);
  }
  return nodes;
}

function deviceAskGateWay(message) {
  const number = readEventNumber(message);
  let updatedMessage = shiftRight(message, 2);
  const mac = readMac(updatedMessage);
  updatedMessage = shiftRight(updatedMessage, 12);
  const nodeMac = readMac(updatedMessage);
  updatedMessage = shiftRight(updatedMessage, 8);
  // let arrayToHex = int8ArrayToHex(updatedMessage);
  const mode = readMode(updatedMessage);
  const modeInt = readModeInt(updatedMessage);
  updatedMessage = shiftRight(updatedMessage, 2);
  const tempHour = readTempHour(updatedMessage);
  updatedMessage = shiftRight(updatedMessage, 1);
  const tempMinute = readTempMinute(updatedMessage);
  updatedMessage = shiftRight(updatedMessage, 1);
  const tempTemp = readTemp(updatedMessage);
  const ret = {
    operation: constants[constants.GATEWAY_ASK_DEVICE],
    count: number,
    mac,
    nodeMac,
    mode,
    modeInt,
    tempHour,
    tempMinute,
    tempTemp,
    message,
    plugin: require('./GateWayConnections'), // eslint-disable-line global-require
  };
  addNodeMode(ret, message);
  return ret;
}

function deviceToGateWay(message) {
  const number = readEventNumber(message);
  let updatedMessage = shiftRight(message, 2);
  const mac = readMac(updatedMessage);
  setField(mac, 'mac', mac);
  updatedMessage = shiftRight(updatedMessage, 12);
  const softVersion = readSoftVersion(updatedMessage);
  setField(mac, 'softVersion', softVersion);
  updatedMessage = shiftRight(updatedMessage, 2);
  const hardVersion = readHardVersion(updatedMessage);
  setField(mac, 'hardVersion', hardVersion);
  updatedMessage = shiftRight(updatedMessage, 1);
  const wifiLevel = readWiFI(updatedMessage);
  setField(mac, 'wifiLevel', wifiLevel);
  updatedMessage = shiftRight(updatedMessage, 2);
  const countNodes = readCountNodes(updatedMessage);
  updatedMessage = shiftRight(updatedMessage, 1);
  const nodes = readNodes(mac, updatedMessage, countNodes);
  setField(mac, 'read', true);
  return {
    operation: constants[constants.GATEWAY_DEVICE],
    count: number,
    mac,
    softVersion,
    hardVersion,
    wifiLevel,
    plugin: require('./GateWayConnections'), // eslint-disable-line global-require
    nodes,
  };
}

function deviceConfirmation(message) {
  const number = readEventNumber(message);
  const updatedMessage = shiftRight(message, 2);
  const mac = readMac(updatedMessage);
  return {
    operation: constants[constants.CONFIRM_WRITE_DEVICE],
    count: number,
    mac,
    plugin: require('./GateWayConnections'), // eslint-disable-line global-require
  };
}

function gateWayToDevice(event) {
  const array = new Uint8Array(44);
  array.set(hexToUint8Array('0002'));
  array.set(int16ToUint8Array(event.count), 2);
  array.set(hexToUint8Array(event.mac), 4);
  const date = new Date();
  const minutes = date.getMinutes();
  const hour = date.getHours();
  const dayOfWeek = date.getDay();
  const year = date.getFullYear();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;
  array.set(int8ToUint8Array(hour), 17);
  array.set(int8ToUint8Array(minutes), 18);
  array.set(int8ToUint8Array(56), 19);
  array.set(int8ToUint8Array(dayOfWeek), 20);
  array.set(int8ToUint8Array(month), 21);
  array.set(int8ToUint8Array(dayOfMonth), 22);
  // array.set(hexToUint8Array('0a06'), 22);
  array.set(int16ToUint8Array(year), 23);
  array.set(hexToUint8Array('000'), 25);
  //  const arrayToHex = int8ArrayToHex(array);
  return array;
}

function gateWayAskDevice(event, node) {
  const array = new Uint8Array(22);
  array.set(hexToUint8Array('00051a00'));
  const macArray = hexToUint8Array(event.mac);
  const macId = macArray.slice(2, 4);
  array.set(
    int16ToUint8Array(generateUniqId() ^ arrayToInt16(macId)) // eslint-disable-line no-bitwise
    , 2,
  );
  array.set(macArray, 4);
  array.set(hexToUint8Array(node.mac), 16);
  return array;
}

function gateWayActionDevice(event, action) {
  const date = new Date();
  const seconds = date.getSeconds();
  const minutes = date.getMinutes();
  const hour = date.getHours();
  const dayOfWeek = date.getDay();
  const node = currentStatus(event.mac).nodes[action.mac];
  if (!node || !node.message) {
    setReAction(action.mac, action);
    return null;
  }
  if (action.type === DEVICE_CHANGE_TYPE) {
    const array = new Uint8Array(415);
    array.set(hexToUint8Array(node.message), 2);
    array.set(hexToUint8Array('0003'));
    array.set(hexToUint8Array(event.mac), 4);
    array.set(hexToUint8Array(action.mac), 16);
    array.set(int16ToUint8Array(generateUniqId()), 22);
    if (action[MODE_INTEGER] !== undefined && action[MODE_INTEGER] !== null) {
      array.set(int8ToUint8Array(action[MODE_INTEGER]), 24);
    }
    if (action[OVERRIDE_TEMPERATURE]) {
      array.set(int16ToUint8Array(action[OVERRIDE_TEMPERATURE] * 9), 28);
    }
    if (action[ECO_TEMPERATURE]) {
      array.set(int16ToUint8Array(action[ECO_TEMPERATURE] * 9), 30);
    }
    if (action[OFF_TEMPERATURE]) {
      array.set(int16ToUint8Array(action[OFF_TEMPERATURE] * 9), 32);
    }
    if (action[SCHEDULE]) {
      array.set((schedulerToHex(action[SCHEDULE])), 51);
    }
    return array;
  }

  const array = new Uint8Array(28);
  array.set(hexToUint8Array('000f'));
  array.set(int16ToUint8Array((hour + minutes + seconds) * dayOfWeek), 2);
  array.set(hexToUint8Array(event.mac), 4);
  array.set(hexToUint8Array(action.mac), 16);
  array.set(int8ToUint8Array(1), 22);
  array.set(int8ToUint8Array(action[TEMP_HOUR] ? action[TEMP_HOUR] : 23), 23);
  array.set(int8ToUint8Array(action[TEMP_MINUTE] ? action[TEMP_MINUTE] : 59), 24);
  array.set(int8ToUint8Array(action[TEMP_ACTION_TYPE] === undefined ?
    1 :
    action[TEMP_ACTION_TYPE]), 25);
  array.set(int16ToUint8Array((action[OVERRIDE_TEMPERATURE]
    ? action[OVERRIDE_TEMPERATURE] :
    320) * 9), 26);
  return array;
}


module.exports.deviceToGateWay = deviceToGateWay;
module.exports.deviceAskGateWay = deviceAskGateWay;
module.exports.gateWayToDevice = gateWayToDevice;
module.exports.gateWayAskDevice = gateWayAskDevice;
module.exports.gateWayActionDevice = gateWayActionDevice;
module.exports.deviceConfirmation = deviceConfirmation;
