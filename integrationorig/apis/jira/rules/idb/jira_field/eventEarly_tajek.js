if ( row.jira_field_def.schema_type && row.jira_field_def.schema_type.toLowerCase() === 'wiki' ) {
    // skipping because there is another rule to handle wiki changes
    return;
}

if (row.jira_field_def.system_attribute === null || row.jira_field_def.system_attribute == row.jira_field_def.user_attribute){
    row.system_value = row.user_value;
}

if (row.jira_field_def.schema_type === 'string' && row.user_value === null){
    row.system_value = "";
    row.user_value = "";
}
