var msg = decodeURI(parameters.msg);

var re = new RegExp(/{.*\"errorMessage\": (.*)}/);
var trimmedMsg = re.exec(msg);
log.debug('trimmedMsg' + JSON.stringify(trimmedMsg));
if (trimmedMsg && trimmedMsg.length > 1){
    trimmedMsg = trimmedMsg[1];
} else {
    trimmedMsg = msg;
}

trimmedMsg = trimmedMsg.replace('\"','"');

return trimmedMsg;
