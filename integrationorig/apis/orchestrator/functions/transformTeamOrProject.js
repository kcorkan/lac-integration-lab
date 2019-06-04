log.debug('transformTeamOrProject' + parameters.data);

var data = JSON.parse(parameters.data);

return data.Team || data.Project || null; 
