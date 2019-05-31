var object_type = row.object_type.toLowerCase();
if (object_type === 'hierarchicalrequirement'){
    object_type = "userstory";
}
row.url = "https://rally1.rallydev.com/#/detail/" + object_type + '/' + row.object_uuid
