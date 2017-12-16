const cheerio = require('cheerio');
var axios = require('axios');
module.exports = function (categoryName, inp, callback) {
  var date = new Date();
  var $  = '';
  // console.log('req: ' + inp + ' , ' + process.pid);
  axios.get('https://www.yellowpages.com.eg/en/category/' + categoryName + '/p' + inp)
  	.then((response)=>{
  		// console.log(response.data);
  		$ = cheerio.load(response.data, {
          withDomLvl1: true,
          normalizeWhitespace: false,
          xmlMode: false,
          decodeEntities: true
      });
      var resultsObject = $('.content-widget').not('.searchDetails');
  		var results = [];
      for (var i = 0; i < resultsObject.length; i++) {
        results.push({
          companyName: resultsObject.eq(i).find('.companyName').text().trim(),
          address: resultsObject.eq(i).find('.row.address').text()
                    .replace(/Map it/g, ($item)=>{
                      return '';
                    }).trim(),
          about: resultsObject.eq(i).find('.aboutUs').text()
                  .replace(/[\n]/g, ($item)=>{
                    return '';
                  }).trim(),
          image: (()=>{
                    let temp = resultsObject.eq(i).find('.content-image.imageAvailable')
                      .find('img').attr('src');
                    if(temp == undefined)return '';
                    return 'https:' + temp;
                  })(),
          keywords: (()=>{
                    let tempArr = [];
                    let tempFirst = resultsObject.eq(i).find('.keyword').text().replace(/ */g, ()=>'').trim();
                    if(tempFirst == '')return tempArr;
                    tempFirst.split(/\n/).forEach(($item)=>{
                      tempArr.push($item);
                    });
                    tempFirst = resultsObject.eq(i).find('.otherKeywords').data('content');
                    if(tempFirst == undefined)return tempArr;
                    tempFirst.trim().split(/<br>/).forEach(($item)=>{
                      tempArr.push($item);
                    });
                    return tempArr;
                  })(),
          categories: (()=>{
                    let tempArr = [];
                    let tempFirst = resultsObject.eq(i).find('.category').text().replace(/ */g, ()=>'').trim();
                    if(tempFirst == '')return tempArr;
                    tempFirst.split(/\n/).forEach(($item)=>{
                      tempArr.push($item);
                    });
                    tempFirst = resultsObject.eq(i).find('.otherCategories').data('content');
                    if(tempFirst == undefined)return tempArr;
                    tempFirst.trim().split(/<br>/).forEach(($item)=>{
                      tempArr.push($item);
                    });
                    return tempArr;
                  })()
        });
      }
      // console.log('response: ' + inp + ' , ' + process.pid + ' ,time: ' + (new Date() - date) + 'ms');
  		callback(null, results)
  	});
}