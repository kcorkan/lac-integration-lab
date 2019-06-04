log.debug('transformMultiFieldConcat');
log.debug('transformMultiFieldConcat BEFORE data: ' + parameters.data);

var data = JSON.parse(parameters.data);

var regex = /({[^{}]*})/gm;
var vars = parameters.inputValue.match(regex) || [];
log.debug('vars ' + vars);
log.debug('transformMultiFieldConcat BEFORE field matches: ' + vars.join(','));

var newStr = parameters.inputValue;
_.each(vars, function(v){
    log.debug("transformMultiFieldConcat BEFORE field: " + v);
    var field = v.replace(/[{}]/g, '');
    field = field.split(":");
    
    var val = null; 

    if (field.length > 0){
        val = data[field[0]] || "";
        log.debug("transformMultiFieldConcat BEFORE individual field value: " + val);
    
    }
    
    if (field.length > 2){
        //field[1] is the string find, and field[2] is replace string 
        var re = new RegExp(field[1],"gm"),
            rep = field[2] || "";
        val = val.replace(re,rep);
        log.debug("transformMultiFieldConcat AFTER replaced individual field value: " + val);    
        
    }
    log.debug("transformMultiFieldConcat BEFORE replaced new value: " + newStr);    
    newStr = newStr.replace(v, val);
    log.debug("transformMultiFieldConcat AFTER replaced new value: " + newStr);  
});
log.debug('transformMultiFieldConcat AFTER: ' + newStr);
return newStr;
