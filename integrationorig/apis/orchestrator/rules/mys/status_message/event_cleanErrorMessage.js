var message_text = row.message_text;  

var classifiers = SysUtility.getResource('classifier');
var thisClassifier = null; 
_.each(classifiers, function(c){
    var re = new RegExp(c.fragment);
    if (re.test(message_text)){
        thisClassifier = c.ident; 
        return false; 
    }
});

if (thisClassifier){
    row.message_classifier_ident = thisClassifier;  
}
