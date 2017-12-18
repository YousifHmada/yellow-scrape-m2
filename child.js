const cheerio = require('cheerio');
let axios = require('axios');
//categoryName the input given from the Api
//inp is the index of page to be fetched
//allow_deep_digging flag when set to true, it allows the childs to go more deeply into the website 
module.exports = function (categoryName, inp, allow_deep_digging, callback) {
  let date = new Date();
  //this would be used by cherrio
  let $  = '';
  //the array containg the results to be returned
  let results = [];
  // console.log('req: ' + inp + ' , ' + process.pid);
  //making the request to the specific page
  axios.get('https://www.yellowpages.com.eg/en/category/' + categoryName + '/p' + inp)
  	.then((response)=>{
  		// console.log(response.data);
      //reading the html response and building up the cheerio obj
  		$ = cheerio.load(response.data, {
          withDomLvl1: true,
          normalizeWhitespace: false,
          xmlMode: false,
          decodeEntities: true
      });
      let resultsObject = $('.content-widget').not('.searchDetails');
      for (let i = 0; i < resultsObject.length; i++) {
        let MapItUrl = '';
        results.push({
          companyName: resultsObject.eq(i).find('.companyName').text().trim(),
          address: (()=>{
                    let tempObj = resultsObject.eq(i).find('.row.address');
                    let tempMap = tempObj.find('.mapIt');
                    if(tempMap.length > 0){
                      MapItUrl = 'https:' + tempMap.attr('href');
                    }
                    return tempObj.text().replace(/Map it/g, ($item)=>{
                              return '';
                            }).trim();
                  })(),
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
          phones: (()=>{
                    let temp = resultsObject.eq(i).find('.loadPhones.ajaxLoad');
                    if(temp.length > 0){
                      return 'https://www.yellowpages.com.eg' + temp.data('link');
                    }else{
                      return '';
                    }         
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
                  })(),
            additionalInfo: (()=>{
                        let temp = resultsObject.eq(i).find('.companyInfo').find('.text-right').find('a').attr('href');
                        if(temp == undefined)return {
                          infoUrl: '',
                          MapItUrl
                        };
                        return {
                          infoUrl: 'https:' + temp,
                          MapItUrl
                        };
                      })()
        });
      }
  	}).then(()=>{
      //go more deep into the search by making another request for each shop that has more_information link
        //promise all would wait for all requests to be resolved and modigying the results array the resolved
        return Promise.all(results.map((obj)=>{
          if(obj.phones != ''){
            return axios.get(obj.phones).then((response)=>{
              // console.log(response.data);
              let $i = cheerio.load(response.data, {
                  withDomLvl1: true,
                  normalizeWhitespace: false,
                  xmlMode: false,
                  decodeEntities: true
              });
              $temporaryArr = [];
              $tempListPhones = $i('.listPhones').children();
              for (var i = 0; i < $tempListPhones.length; i++) {
                $temporaryArr.push($tempListPhones.eq(i).text());
              }
              obj.phones = $temporaryArr;
            });
          }
        }));
    }).then(()=>{
      // console.log('response: ' + inp + ' , ' + process.pid + ' ,time: ' + (new Date() - date) + 'ms');
      //checking the allow_deep_digging flag 
      if(!allow_deep_digging); //resolving to return the previous results array
      else{
        //go more deep into the search by making another request for each shop that has more_information link
        //promise all would wait for all requests to be resolved and modigying the results array the resolved
        return Promise.all(results.map((obj)=>{
          if(obj.additionalInfo.infoUrl != ''){
            return axios.get(obj.additionalInfo.infoUrl).then((response)=>{
              // console.log(response.data);
              let $i = cheerio.load(response.data, {
                  withDomLvl1: true,
                  normalizeWhitespace: false,
                  xmlMode: false,
                  decodeEntities: true
              });
              obj.facebook = (()=>{
                              let temp = $i('.socialLinks').find('.facebook').attr('href');
                              if(temp == undefined)return '';
                              return temp;
                            })();
              obj.ratingTotal = (()=>{
                              let temp = $i('.ratingTotal').text().trim();
                              if(temp == undefined)return 0;
                              return parseFloat(temp);
                            })();
              obj.photos = (()=>{
                              let tempArr = $i('#photos').find('.openSlider');
                              let tempResultsArr = [];
                              if(tempArr.length > 0){
                                for (let i = 0; i < tempArr.length; i++) {
                                  let temp = tempArr.eq(i).attr('src');
                                  if(temp == undefined)continue;
                                  tempResultsArr.push('https:' + temp);
                                }
                              }
                              return tempResultsArr;
                            })(); 
              obj.menus = (()=>{
                              let tempArr = $i('#menus').find('.openSlider');
                              let tempResultsArr = [];
                              if(tempArr.length > 0){
                                for (let i = 0; i < tempArr.length; i++) {
                                  let temp = tempArr.eq(i).attr('src');
                                  if(temp == undefined)continue;
                                  tempResultsArr.push('https:' + temp);
                                }
                              }
                              return tempResultsArr;
                            })();
              obj.branches = (()=>{
                              let tempArr = $i('#branches').find('a');
                              let tempResultsArr = [];
                              if(tempArr.length > 0){
                                for (let i = 0; i < tempArr.length; i++) {
                                  let temp = tempArr.eq(i).text().replace(/\\n/g,()=>'').trim();
                                  if(temp == undefined)continue;
                                  tempResultsArr.push(temp);
                                }
                              }
                              return tempResultsArr;
                            })();
              obj.reviews = (()=>{
                              let tempArr = $i('#reviews').find('.topPadding15');
                              let tempResultsArr = [];
                              if(tempArr.length > 0){
                                for (let i = 0; i < tempArr.length; i++) {
                                  let temp = tempArr.eq(i).text().replace(/\\n/g,()=>'').trim();
                                  if(temp == undefined)continue;
                                  tempResultsArr.push(temp);
                                }
                              }
                              return tempResultsArr;
                            })();
            });
          }
        }));
      }
    }).then(()=>{
      //checking the allow_deep_digging flag 
      if(!allow_deep_digging); //resolving to return the previous results array
      else{
        //go more deep into the search by making another request for each shop that has Map it link
        //promise all would wait for all requests to be resolved and modigying the results array the resolved
        return Promise.all(results.map((obj)=>{
          if(obj.additionalInfo.MapItUrl != ''){
            return axios.get(obj.additionalInfo.MapItUrl).then((response)=>{
                response.data.replace(/var *companies[^;]*/g, ($match)=>{
                  $match.replace(/\[[\s\S]*/g, ($MapObj)=>{
                    $tempObj = eval($MapObj);
                    obj.mapItInfo = $tempObj[0];
                    obj.mapUrl = 'http://maps.google.com/maps?q=' + $tempObj[0].lat + ',' + $tempObj[0].lng;
                  })
                });
            });
          }
        }));
      }
    }).then(()=>{
      callback(null, results); //call back with the result array
    });
}