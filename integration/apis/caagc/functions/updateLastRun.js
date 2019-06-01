var sts = new Date().toISOString();
if (parameters.last_run_date){
    sts = parameters.last_run_date;
}
row.last_run = sts;
return {"lastRun": sts};

