if (req.resourceName == 'catalyst'){
    if ((row.object_id === null) || (row.object_type === null) || (row.api_def_ident === null) || (row.system_ident === null)){
        return false;
    }    
    
    if (isNaN(row.api_def_ident) || isNaN(row.system_ident)){
        return false; 
    }
}
return true; 
