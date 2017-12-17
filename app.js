var express = require('express');
var fetchAndExecute = require('./child');
var app = express();
var bodyParser = require('body-parser');
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

//support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));

//create a scrape function: 
var scrape = function(parallel, categoryName, numPages, allow_deep_digging) {
	return new Promise((resolve, reject)=>{
		var date = new Date();
		var ret = 0;
		let results = [];
		if(parallel){
			for (var i = 1; i <= numPages; i++) {
			  //generating tasks
			  workers(categoryName, i, allow_deep_digging, function (err, out) {
			    //this is called after the task is finished
			    // console.log(out);
			    for (var i = 0; i < out.length; i++) {
			    	let tempObj = {};
			    	if(allow_deep_digging){
			    		tempObj = {
				    		companyName: out[i].companyName,
				    		address: out[i].address,
				    		about: out[i].about,
				    		image: out[i].image,
				    		keywords: out[i].keywords,
				    		categories: out[i].categories,
				    		facebook: (out[i].facebook) ? out[i].facebook : '',
				    		ratingTotal: (out[i].ratingTotal) ? out[i].ratingTotal : 0,
				    		photos: (out[i].photos) ? out[i].photos : [],
				    		menus: (out[i].menus) ? out[i].menus : [],
				    		branches: (out[i].branches) ? out[i].branches : [],
				    		reviews: (out[i].reviews) ? out[i].reviews : []
				    	};
			    	}else{
			    		tempObj = {
				    		companyName: out[i].companyName,
				    		address: out[i].address,
				    		about: out[i].about,
				    		image: out[i].image,
				    		keywords: out[i].keywords,
				    		categories: out[i].categories
				    	};
			    	}
			    	results.push(tempObj);
			    }
			    if(++ret == numPages){
			    	//this is called after all tasks are finished
			    	// console.log('processes finished');
			    	console.log('parallel operation ', (new Date() - date) + 'ms'); // operation: 17numPages3.916ms
			    	resolve({results,time: (new Date() - date) + 'ms'});
			    }
			  })
			}//parallel
		}else{
			//simulate sequential mode
			for (var i = 1; i <= numPages; i++) {
			  //generating tasks
			  fetchAndExecute(categoryName, i, allow_deep_digging, function (err, out) {
			  	//this is called after the task is finished
			    // console.log(out);
			    for (var i = 0; i < out.length; i++) {
			    	let tempObj = {};
			    	if(allow_deep_digging){
			    		tempObj = {
				    		companyName: out[i].companyName,
				    		address: out[i].address,
				    		about: out[i].about,
				    		image: out[i].image,
				    		keywords: out[i].keywords,
				    		categories: out[i].categories,
				    		facebook: (out[i].facebook) ? out[i].facebook : '',
				    		ratingTotal: (out[i].ratingTotal) ? out[i].ratingTotal : 0,
				    		photos: (out[i].photos) ? out[i].photos : [],
				    		menus: (out[i].menus) ? out[i].menus : [],
				    		branches: (out[i].branches) ? out[i].branches : [],
				    		reviews: (out[i].reviews) ? out[i].reviews : []
				    	};
			    	}else{
			    		tempObj = {
				    		companyName: out[i].companyName,
				    		address: out[i].address,
				    		about: out[i].about,
				    		image: out[i].image,
				    		keywords: out[i].keywords,
				    		categories: out[i].categories
				    	};
			    	}
			    	results.push(tempObj);
			    }
			    if(++ret == numPages){
			    	//this is called after all tasks are finished
			    	// console.log('processes finished');
			    	console.log('sequential operation ', (new Date() - date) + 'ms'); // operation: 1753.916ms
			    	resolve({results,time: (new Date() - date) + 'ms'});
			    }
			  });
			}//sequential
		}
	});
}

app.post('/', (req, res)=>{
	let data = req.body;
	scrape(true, data.category, data.numberPages, data.allow_deep_digging)
	.then((result)=>{
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(result, null, 2)); //write a response to the client
	});
});

app.get('/p', (req, res)=>{
	scrape(true, 'fast food', 1, true)
	.then((result)=>{
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(result, null, 2)); //write a response to the client
	});
})
app.get('/s', (req, res)=>{
	scrape(false, 'fast food', 1, false)
	.then((result)=>{
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(result, null, 2)); //write a response to the client
	});
})


app.listen((process.env.PORT || 8080), ()=>{
	console.log("server is running on port " +(process.env.PORT || 8080));
}); //the server object listens on port 8080