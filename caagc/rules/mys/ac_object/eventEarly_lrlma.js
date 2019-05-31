if (req.resourceName === "_fromAgileCentral" && row.xref_id === null){
    row.xref_id = "caagc-" + row.ident;
}
