module.exports = function (inp, callback) {
  let out = 0;
  for (var i = 0; i < 10000000; i++) {
  	out += i;
  }
  callback(null, out, inp + ' ' + out + ' BAR (' + process.pid + ')')
}