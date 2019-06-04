if (req.resourceName === "_fromJira" && row.xref_id === null){
    row.xref_id = "jira-" + row.ident;
}
