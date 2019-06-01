log.debug('schema_type: ' + row.schema_type);
switch(row.schema_type){
    case "project": 
        row.user_attribute = "key";  
        row.system_attribute = "key";
        break; 
    
    case "priority":
        row.user_attribute = "name";
        row.system_attribute = "id";
        break; 
    
    case "user":
        row.user_attribute = "displayName";
        row.system_attribute = "key";
        break; 
    
    case "status":
    case "issuetype":        
        row.user_attribute = "name";
        row.system_attribute = "id";
        break; 

    case "string":
      case "array":
        row.user_attribute = "";
        row.system_attribute = "";
        if (row.name === "Sprint"){
            row.user_attribute = "name";
            row.system_attribute = "id";
        }
        break;
    case "option":
        row.user_attribute = "value";
        row.system_attribute = "value";
        break;
    case "board":
        row.system_attribute = "id";
        row.user_attribute = "name";
        break;
    case "option-with-child":
    case "resolution":
    case "number":
    case "datetime":
    case "date":
    case "any":
    case "progress":
    case "votes":
    case "watches":
    case "timetracking":
    case "comments-page":
    
        break;
    default: 
        return;
}
