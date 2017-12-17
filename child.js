const cheerio = require('cheerio');
let axios = require('axios');
module.exports = function (categoryName, inp, allow_deep_digging, callback) {
  let date = new Date();
  let $  = '';
  let results = [];
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
      let resultsObject = $('.content-widget').not('.searchDetails');
      for (let i = 0; i < resultsObject.length; i++) {
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
                  })(),
            additionalInfo: (()=>{
                        let temp = resultsObject.eq(i).find('.companyInfo').find('.text-right').find('a').attr('href');
                        if(temp == undefined)return '';
                        return 'https:' + temp;
                      })()
        });
      }
  	}).then(()=>{
      // console.log('response: ' + inp + ' , ' + process.pid + ' ,time: ' + (new Date() - date) + 'ms');
      if(!allow_deep_digging);
      else{
        return Promise.all(results.map((obj)=>{
          if(obj.additionalInfo != ''){
            return axios.get(obj.additionalInfo).then((response)=>{
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
      callback(null, results);
    });
}