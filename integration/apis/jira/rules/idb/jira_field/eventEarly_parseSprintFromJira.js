if (req.resourceName === "_fromJira" && row.getParent('jira_field_def').name === "Sprint"){
  //The transform in buildSpecIssueWebhookToObject will only take the first element of the array
  log.debug(JSON.stringify(row));

  var sprintStr = row.system_value || row.user_value,
        sprint = {};
  log.debug('sprintStr' + sprintStr);
  var m; // regex matches
  var sprintRecords = {}; // holds sprints as rows, and sprintElements as fields. Represent as 2D array, add as process fields
  var currentSprint = 0;  // an issue can be assigned to multiple sprints, but which is the "current" sprint?

  if (sprintStr !== null){
    // we can have multiple sprints assigned. We can have multiple state=CLOSED, but only one more assigned and state will be [ACTIVE or FUTURE].
    // when the issue is Accepted/Done, and the sprint that the issue is in - is also CLOSED -> ALL associated sprints will be state=CLOSED!!!
    // the id=??? may not be in order, but it seems that the sequence=??? will have the last assigned sprint as the largest value
    // could also compare startDate or endDate for the most recent. Format=CCCC-MM-DDTHH:MM:SS.NNN-H:MM
    sprintArr = sprintStr.split(gCFG.arrayDelimiter); // 1-dimensional collection of strings - representing sprints
    if (sprintArr.length > 0){
        var latestSequenceNumber = 0;       // the latest sequence is a field in the sprint record. The highest value - is on the current sprint
        for (sprintIndex=0; sprintIndex < sprintArr.length; sprintIndex++){
            // setup parsing each sprint match
            var re = /\[(.*)\]/g;
            while ((sprintMatches = re.exec(sprintArr[sprintIndex])) !== null) {
                // This is necessary to avoid infinite loops with zero-width matches
                if (sprintMatches.index === re.lastIndex) {
                    re.lastIndex++;
                }
                // Each match will look like this: id=123,rapidViewId=234,state=ACTIVE,name=xys,startDate=2019-01-01,endDate=...
                sprintMatches.forEach(function(match, groupIndex){
                    sprintRecords[sprintIndex] = {};    // establish fields dimension
                    var sprintMatchFields = match.split(',');
                    for (var fieldIndex=0; fieldIndex < sprintMatchFields.length; fieldIndex++){
                        var p = sprintMatchFields[fieldIndex].split('='); // name=value pairs
                        if (p.length > 1){
                            sprintRecords[sprintIndex][p[0]] = p[1];   // set p[0]=the field name and p[1]=the field value
                            log.debug('[Jira API][Parse Sprint _fromJira] sprintRecords[' + sprintIndex + '][' + p[0] + ']=' + sprintRecords[sprintIndex][p[0]]);

                            // update the highest/latest sequence number if the new record is higher
                            if (p[0] == 'sequence'){
                                if (latestSequenceNumber < p[1]){
                                    latestSequenceNumber = p[1]; // capture for comparison
                                    currentSprint = sprintIndex; // capture the current sprint - if it has the highest sequence number so far.
                                }
                            }
                        }
                    }
                });
            }
        }
        // find the sprint with the latest sequence number and assign to the sprint we're keeping for Agile Central.
        sprint = sprintRecords[currentSprint]; // assign the most recent sprint to the one we're keeping.
    }
  }

  log.debug('sprint ' + JSON.stringify(sprint));

  if (!_.isEmpty(sprint)){
    var system_attr = row.getParent('jira_field_def').system_attribute || "id",
        user_attr = row.getParent('jira_field_def').user_attribute || "name";
      row.system_value = sprint[system_attr];
      row.user_value = sprint[user_attr];
  } else {
      row.system_value = null;
      row.user_value = null;
  }

  //Add this in here in case this rule fires after the last updated rule.
  if (logicContext.getVerb().toUpperCase() == "UPDATE"){
    if (oldRow && oldRow.user_value === row.user_value && oldRow.system_value === row.system_value){
        row.last_updated = oldRow.last_updated;
    }
  }
}
