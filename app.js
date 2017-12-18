let express = require('express');
let axios = require('axios');
const config = require('./config');
const { Client } = require('pg');
let fetchAndExecute = require('./child');
let app = express();
let bodyParser = require('body-parser');
let workerFarm = require('worker-farm')
  , workers    = workerFarm({
    maxCallsPerWorker           : Infinity
  , maxConcurrentWorkers        : require('os').cpus().length
  , maxConcurrentCallsPerWorker : Infinity
  , maxConcurrentCalls          : Infinity
  , maxCallTime                 : Infinity
  , maxRetries                  : Infinity
  , autoStart                   : false
}, require.resolve('./child'));

//connecting to postgredb
const client = new Client(config.postgre)
client.connect()

//to make a bulk insert from given array of queries
let insertIntoDB = function(queriesArr) {
	return new Promise((resolve, reject)=>{
		let querystring = "insert into shop(companyName,address,about,image,keywords,categories,facebook,ratingTotal,photos,menus,branches,reviews,mapUrl) values";
		let flag = false;
		queriesArr.forEach(($query)=>{
			querystring += flag ? ",(" + $query + ")" : "(" + $query + ")";
			if(!flag)flag = true;
		});
		// console.log('statement', querystring);
		client.query(querystring, (err, response) => {
				if(err != null){
					reject(err);
				}else{
					resolve();
				}
		})
	});
}

//to escape ' and " with ^ from any given string 
//this is required for the database insertions to work properly
let escapeForSql = function($item){
	return $item.replace(/['"]/g,()=>'^');
}

//support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));

//create a scrape function: 
//the parallel flag determines if we will operate on the main thread or on multiple child threads
//categoryName the input given from the Api
//numPages is given from the api to determine the number of iterations
//allow_deep_digging flag when set to true, it allows the childs to go more deeply into the website 
//and fetch "more information" like facebook, photos, menus, reviews, rate, etc
//store_data a flag to let the driver store the data after sending back the response  
let scrape = function(parallel, categoryName, numPages, allow_deep_digging, store_data) {
	return new Promise((resolve, reject)=>{
		//to count the whole time spend
		let date = new Date();
		//to determine how many workers has finished to terminate the process
		let ret = 0;
		//this is the array given back to the api as results
		let results = [];
		//this is the array that would be given to the insertIntoDB function
		let queries = [];
		if(parallel){
			//parallel
			for (let i = 1; i <= numPages; i++) {
			  //generating tasks
			  workers(categoryName, i, allow_deep_digging, function (err, out) {
			    //this is called after the task is finished
			    // console.log(out);
			    for (let i = 0; i < out.length; i++) {
			    	let tempObj = {};
			    	let tempInsertValues = '';
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
				    		reviews: (out[i].reviews) ? out[i].reviews : [],
				    		mapItInfo: out[i].mapItInfo,
				    		mapUrl: out[i].mapUrl
				    	}
				    	if(store_data){
				    		tempInsertValues += "'" + escapeForSql( tempObj.companyName ) + "'";
					    	if(tempObj.address == '' || tempObj.address == null)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ",'" + escapeForSql( tempObj.address ) + "'";
					    	}
					    	if(tempObj.about == '' || tempObj.about == null)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ",'" + escapeForSql( tempObj.about ) + "'";
					    	}
					    	if(tempObj.image == '' || tempObj.image == null)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ",'" + escapeForSql( tempObj.image ) + "'";
					    	}
					    	if(tempObj.keywords.length <= 0)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ',' + "'{" + tempObj.keywords.map(($item)=>'"' + escapeForSql( $item ) + '"').join() + "}'";
					    	}
					    	if(tempObj.categories.length <= 0)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ',' + "'{" + tempObj.categories.map(($item)=>'"' + escapeForSql( $item ) + '"').join() + "}'";
					    	}
					    	if(tempObj.facebook == '' || tempObj.facebook == null)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ",'" + escapeForSql( tempObj.facebook ) + "'";
					    	}
					    	if(tempObj.ratingTotal == '' || tempObj.ratingTotal == null)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ',' + tempObj.ratingTotal;
					    	}
					    	if(tempObj.photos.length <= 0)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ',' + "'{" + tempObj.photos.map(($item)=>'"' + escapeForSql( $item ) + '"').join() + "}'";
					    	}
					    	if(tempObj.menus.length <= 0)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ',' + "'{" + tempObj.menus.map(($item)=>'"' + escapeForSql( $item ) + '"').join() + "}'";
					    	}
					    	if(tempObj.branches.length <= 0)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ',' + "'{" + tempObj.branches.map(($item)=>'"' + escapeForSql( $item ) + '"').join() + "}'";
					    	}
					    	if(tempObj.reviews.length <= 0)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ',' + "'{" + tempObj.reviews.map(($item)=>{
							    		return $item.replace(/,/g,()=>'__')
							    	}).map(($item)=>'"' + escapeForSql( $item ) + '"').join() + "}'";
					    	}
					    	if(tempObj.mapUrl == '' || tempObj.mapUrl == null)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ",'" + escapeForSql( tempObj.mapUrl ) + "'";
					    	}
					    	queries.push(tempInsertValues);
				    	}
			    	}else{
			    		tempObj = {
				    		companyName: out[i].companyName,
				    		address: out[i].address,
				    		about: out[i].about,
				    		image: out[i].image,
				    		keywords: out[i].keywords,
				    		categories: out[i].categories
				    	};
				    	if(store_data){
					    	tempInsertValues += "'" + escapeForSql( tempObj.companyName ) + "'";
					    	if(tempObj.address == '' || tempObj.address == null)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ",'" + escapeForSql( tempObj.address ) + "'";
					    	}
					    	if(tempObj.about == '' || tempObj.about == null)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ",'" + escapeForSql( tempObj.about ) + "'";
					    	}
					    	if(tempObj.image == '' || tempObj.image == null)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ",'" + escapeForSql( tempObj.image ) + "'";
					    	}
					    	if(tempObj.keywords.length <= 0)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ',' + "'{" + tempObj.keywords.map(($item)=>'"' + escapeForSql( $item ) + '"').join() + "}'";
					    	}
					    	if(tempObj.categories.length <= 0)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ',' + "'{" + tempObj.categories.map(($item)=>'"' + escapeForSql( $item ) + '"').join() + "}'";
					    	}
					    	tempInsertValues += ',null';
					    	tempInsertValues += ',null';
					    	tempInsertValues += ',null';
					    	tempInsertValues += ',null';
					    	tempInsertValues += ',null';
					    	tempInsertValues += ',null';
					    	queries.push(tempInsertValues);
					    }
			    	}
			    	results.push(tempObj);
			    }
			    if(++ret == numPages){
			    	//this is called after all tasks are finished
			    	// console.log('processes finished');
			    	// console.log('queries ', queries);
			    	console.log('parallel operation ', (new Date() - date) + 'ms'); // operation: <No>ms
			    	if(store_data){
			    		// Promise.all((()=>{
				    	// 	let tempArray = [];
				    	// 	let numIterations = Math.ceil(queries.length / 20);
				    	// 	for(let i = 0; i < numIterations; i++)
				    	// 	{
				    	// 		tempArray.push(insertIntoDB(queries.slice((20*i), 20*(i+1))));
				    	// 	}
				    	// 	return tempArray;
				    	// })()).catch((error)=>console.log('insertion error ',error));
				    	insertIntoDB(queries).catch((error)=>console.log('insertion error ',error));
			    	}
			    	resolve({results,time: (new Date() - date) + 'ms'});
			    }
			  })
			}//parallel
		}else{
			//simulate sequential mode
			for (let i = 1; i <= numPages; i++) {
			  //generating tasks
			  fetchAndExecute(categoryName, i, allow_deep_digging, function (err, out) {
			  	//this is called after the task is finished
			    // console.log(out);
			    for (let i = 0; i < out.length; i++) {
			    	let tempObj = {};
			    	let tempInsertValues = '';
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
				    		reviews: (out[i].reviews) ? out[i].reviews : [],
				    		mapItInfo: out[i].mapItInfo,
				    		mapUrl: out[i].mapUrl
				    	}
				    	if(store_data){
				    		tempInsertValues += "'" + escapeForSql( tempObj.companyName ) + "'";
					    	if(tempObj.address == '' || tempObj.address == null)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ",'" + escapeForSql( tempObj.address ) + "'";
					    	}
					    	if(tempObj.about == '' || tempObj.about == null)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ",'" + escapeForSql( tempObj.about ) + "'";
					    	}
					    	if(tempObj.image == '' || tempObj.image == null)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ",'" + escapeForSql( tempObj.image ) + "'";
					    	}
					    	if(tempObj.keywords.length <= 0)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ',' + "'{" + tempObj.keywords.map(($item)=>'"' + escapeForSql( $item ) + '"').join() + "}'";
					    	}
					    	if(tempObj.categories.length <= 0)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ',' + "'{" + tempObj.categories.map(($item)=>'"' + escapeForSql( $item ) + '"').join() + "}'";
					    	}
					    	if(tempObj.facebook == '' || tempObj.facebook == null)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ",'" + escapeForSql( tempObj.facebook ) + "'";
					    	}
					    	if(tempObj.ratingTotal == '' || tempObj.ratingTotal == null)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ',' + tempObj.ratingTotal;
					    	}
					    	if(tempObj.photos.length <= 0)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ',' + "'{" + tempObj.photos.map(($item)=>'"' + escapeForSql( $item ) + '"').join() + "}'";
					    	}
					    	if(tempObj.menus.length <= 0)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ',' + "'{" + tempObj.menus.map(($item)=>'"' + escapeForSql( $item ) + '"').join() + "}'";
					    	}
					    	if(tempObj.branches.length <= 0)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ',' + "'{" + tempObj.branches.map(($item)=>'"' + escapeForSql( $item ) + '"').join() + "}'";
					    	}
					    	if(tempObj.reviews.length <= 0)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ',' + "'{" + tempObj.reviews.map(($item)=>{
							    		return $item.replace(/,/g,()=>'__')
							    	}).map(($item)=>'"' + escapeForSql( $item ) + '"').join() + "}'";
					    	}
					    	if(tempObj.mapUrl == '' || tempObj.mapUrl == null)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ",'" + escapeForSql( tempObj.mapUrl ) + "'";
					    	}
					    	queries.push(tempInsertValues);
				    	}
			    	}else{
			    		tempObj = {
				    		companyName: out[i].companyName,
				    		address: out[i].address,
				    		about: out[i].about,
				    		image: out[i].image,
				    		keywords: out[i].keywords,
				    		categories: out[i].categories
				    	};
				    	if(store_data){
					    	tempInsertValues += "'" + escapeForSql( tempObj.companyName ) + "'";
					    	if(tempObj.address == '' || tempObj.address == null)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ",'" + escapeForSql( tempObj.address ) + "'";
					    	}
					    	if(tempObj.about == '' || tempObj.about == null)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ",'" + escapeForSql( tempObj.about ) + "'";
					    	}
					    	if(tempObj.image == '' || tempObj.image == null)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ",'" + escapeForSql( tempObj.image ) + "'";
					    	}
					    	if(tempObj.keywords.length <= 0)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ',' + "'{" + tempObj.keywords.map(($item)=>'"' + escapeForSql( $item ) + '"').join() + "}'";
					    	}
					    	if(tempObj.categories.length <= 0)tempInsertValues += ',null';
					    	else{
					    		tempInsertValues += ',' + "'{" + tempObj.categories.map(($item)=>'"' + escapeForSql( $item ) + '"').join() + "}'";
					    	}
					    	tempInsertValues += ',null';
					    	tempInsertValues += ',null';
					    	tempInsertValues += ',null';
					    	tempInsertValues += ',null';
					    	tempInsertValues += ',null';
					    	tempInsertValues += ',null';
					    	queries.push(tempInsertValues);
					    }
			    	}
			    	results.push(tempObj);
			    }
			    if(++ret == numPages){
			    	// this is called after all tasks are finished
			    	// console.log('processes finished');
			    	// console.log('queries ', queries);
			    	console.log('sequential operation ', (new Date() - date) + 'ms'); // operation: 1753.916ms
			    	if(store_data){
			    		// Promise.all((()=>{
				    	// 	let tempArray = [];
				    	// 	let numIterations = Math.ceil(queries.length / 20);
				    	// 	for(let i = 0; i < numIterations; i++)
				    	// 	{
				    	// 		tempArray.push(insertIntoDB(queries.slice((20*i), 20*(i+1))));
				    	// 	}
				    	// 	return tempArray;
				    	// })()).catch((error)=>console.log('insertion error ',error));
				    	insertIntoDB(queries).catch((error)=>console.log('insertion error ',error));
			    	}
			    	resolve({results,time: (new Date() - date) + 'ms'});
			    }
			  });
			}//sequential
		}
	});
}

app.post('/', (req, res)=>{
	let data = req.body;
	// the function to start the crawling process
	scrape(true, data.category, data.numberPages, data.allow_deep_digging, data.store_data)
	.then((result)=>{
		//write a response to the client
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(result, null, 2)); 
	});
});

app.get('/', (req, res)=>{
	scrape(true, 'fast food', 134, true, true)
	.then((result)=>{
		//write a response to the client
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(result, null, 2)); 
	});
});


//let the server listen on the given port
app.listen((process.env.PORT || 8080), ()=>{
	console.log("server is running on port " +(process.env.PORT || 8080));
}); //the server object listens on port 8080