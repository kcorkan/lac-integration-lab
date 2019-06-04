log.info(req.resourceName + 'revision ' + oldRow.revision + ' ' + row.revision)
if (req.resourceName === "_fromAgileCentral" && oldRow.revision === row.revision && row.revision > 1){
  row.last_updated = oldRow.last_updated;
  return;
}

if (oldRow.system_value == row.system_value && oldRow.user_value == row.user_value){
   row.last_updated = oldRow.last_updated;
   return;
} 

//Don't make updates if the current data is newer than the data being copied.  
if (moment(oldRow.last_updated) > moment(row.last_updated)){
    row.system_value = oldRow.system_value;
    row.user_value = oldRow.user_value; 
    row.last_updated = oldRow.last_updated;
}
