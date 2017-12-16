var http = require('http');
var workerFarm = require('worker-farm')
  , workers    = workerFarm({
    maxCallsPerWorker           : Infinity
  , maxConcurrentWorkers        : require('os').cpus().length
  , maxConcurrentCallsPerWorker : Infinity
  , maxConcurrentCalls          : Infinity
  , maxCallTime                 : Infinity
  , maxRetries                  : Infinity
  , autoStart                   : false
}, require.resolve('./child'))
  , ret        = 0

//create a scrape function: 
var scrape = function(parallel) {
	return new Promise((resolve, reject)=>{
		var date = new Date();
		console.time('operation');
		let sum = 0;
		if(parallel){
			for (var i = 0; i < 50; i++) {
			  //generating 50 tasks
			  workers('#' + i + ' FOO', function (err, out, outp) {
			    //this is called after the task is finished
			    //console.log(outp);
			    sum += out;
			    if(++ret == 50){
			    	//this is called after all tasks are finished
			    	console.log('processes finished');
			    	console.timeEnd('operation'); // operation: 1753.916ms
			    	resolve({sum,time: (new Date() - date) + 'ms'});
			    }
			  })
			}//parallel
		}else{
			//simulate sequential mode
			for (var j = 0; j < 50; j++) {
			  let out = 0;
			  for (var i = 0; i < 10000000; i++) {
			  	out += i;
			  }
				 sum += out;
			  //console.log(j ,out);
			}
			console.timeEnd('operation'); // operation: 2514.907ms
			resolve({sum,time: (new Date() - date) + 'ms'});
			//sequential
		}
	});
}


//create a server object: 
http.createServer(function (req, res) {
	if(req.url == '/p'){
		scrape(true)
			.then((result)=>{
				res.write(JSON.stringify(result)); //write a response to the client
  				res.end(); //end the response
			});
	}else if(req.url == '/s'){
		scrape(false)
			.then((result)=>{
				res.write(JSON.stringify(result)); //write a response to the client
  				res.end(); //end the response
			});
	}
}).listen(process.env.PORT || 8080); //the server object listens on port 8080