if (oldRow.system_value === row.system_value && oldRow.user_value === row.user_value){
    row.last_updated = oldRow.last_updated;
    return;
}

//Don't make updates if the current data is newer than the data being copied.  
if (moment(oldRow.last_updated) > moment(row.last_updated)){
    log.debug('oldRow is newer than row ' + oldRow.last_updated + row.last_updated);
    row.system_value = oldRow.system_value;
    row.user_value = oldRow.user_value; 
    row.last_updated = oldRow.last_updated;
}
