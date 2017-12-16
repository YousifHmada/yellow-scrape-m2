var http = require('http');
var fetchAndExecute = require('./child');
var workerFarm = require('worker-farm')
  , workers    = workerFarm({
    maxCallsPerWorker           : Infinity
  , maxConcurrentWorkers        : require('os').cpus().length
  , maxConcurrentCallsPerWorker : Infinity
  , maxConcurrentCalls          : Infinity
  , maxCallTime                 : Infinity
  , maxRetries                  : Infinity
  , autoStart                   : false
}, require.resolve('./child'));

//create a scrape function: 
var scrape = function(parallel, numPages) {
	return new Promise((resolve, reject)=>{
		var date = new Date();
		var ret = 0;
		let sum = [];
		if(parallel){
			for (var i = 1; i <= numPages; i++) {
			  //generating tasks
			  workers(i, function (err, out) {
			    //this is called after the task is finished
			    // console.log(out);
			    sum.push(out);
			    if(++ret == numPages){
			    	//this is called after all tasks are finished
			    	// console.log('processes finished');
			    	console.log('parallel operation ', (new Date() - date) + 'ms'); // operation: 17numPages3.916ms
			    	resolve({sum,time: (new Date() - date) + 'ms'});
			    }
			  })
			}//parallel
		}else{
			//simulate sequential mode
			for (var i = 1; i <= numPages; i++) {
			  //generating tasks
			  fetchAndExecute(i, function (err, out) {
			  	//this is called after the task is finished
			    // console.log(out);
			    sum.push(out);
			    if(++ret == numPages){
			    	//this is called after all tasks are finished
			    	// console.log('processes finished');
			    	console.log('sequential operation ', (new Date() - date) + 'ms'); // operation: 1753.916ms
			    	resolve({sum,time: (new Date() - date) + 'ms'});
			    }
			  });
			}//sequential
		}
	});
}


//create a server object: 
http.createServer(function (req, res) {
	if(req.url == '/p'){
		scrape(true, 50)
			.then((result)=>{
				res.setHeader('Content-Type', 'application/json');
				res.write(JSON.stringify(result, null, 2)); //write a response to the client
  				res.end(); //end the response
			});
	}else if(req.url == '/s'){
		scrape(false, 50)
			.then((result)=>{
				res.setHeader('Content-Type', 'application/json');
				res.write(JSON.stringify(result, null, 2)); //write a response to the client
  				res.end(); //end the response
			});
	}
}).listen(process.env.PORT || 8080); //the server object listens on port 8080