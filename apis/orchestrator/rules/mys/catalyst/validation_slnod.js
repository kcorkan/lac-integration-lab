try {
    var data = JSON.parse(row.source_data);
    var exists = data && Object.keys(data) && Object.keys(data).length > 0 || false;
    return exists; 
} catch (ex){
    // This is primarily going to catch when we try to call JSON.parse a non-parsable string
    log.warning("Error parsing source data for catalyst_ident [" + row.ident + "]: " + ex);
    return false; 
}
