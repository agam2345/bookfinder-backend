const tf = require('@tensorflow/tfjs');

async function recomendBook() {
  const model = await tf.loadGraphModel('http://localhost:5000/model/model.json');
  console.log(model)
  
}

recomendBook()



module.exports = recomendBook