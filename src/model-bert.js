const tf = require('@tensorflow/tfjs-node');
let tokenizerPromise = (async () => {
  const { AutoTokenizer } = await import('@xenova/transformers');
  return AutoTokenizer.from_pretrained('bert-base-uncased');
})();
function cosineSimilarity(a, b) {
  const dotProduct = tf.sum(tf.mul(a, b)).dataSync()[0];
  const normA = tf.norm(a).dataSync()[0];
  const normB = tf.norm(b).dataSync()[0];
  return dotProduct / (normA * normB);
}
const modelPromise = tf.loadGraphModel('file://model/model.json');

async function recomendBook(query, token) {
  const tokenizer = await tokenizerPromise;
  const model = await modelPromise;
  
  const inputText = query;
  
  const fetchResponse = await fetch('https://bookfinder-backend-production.up.railway.app/books', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const responseBooks = await fetchResponse.json();
  console.log("Response Type:", responseBooks); 
  const books = responseBooks.data;
  
  const encodedInput = await tokenizer.encode(inputText);
  const inputIdsTensor = tf.tensor([encodedInput], undefined, 'int32');
  const attentionMaskTensor = tf.tensor([Array(encodedInput.length).fill(1)], undefined, 'int32');
  const tokenTypeIdsTensor = tf.tensor([Array(encodedInput.length).fill(0)], undefined, 'int32');
  
  const userInputResult = await model.execute({
    input_ids: inputIdsTensor,
    attention_mask: attentionMaskTensor,
    token_type_ids: tokenTypeIdsTensor,
  });
  console.log("User input result:", userInputResult);
  
  const bookEmbeddings = [];
  for (const book of books) {
    const bookDescription = book.title;
    const encodedDescription = await tokenizer.encode(bookDescription);
    const descriptionIdsTensor = tf.tensor([encodedDescription], undefined, 'int32');
    const descriptionAttentionMask = tf.tensor([Array(encodedDescription.length).fill(1)], undefined, 'int32');
    const descriptionTokenTypeIds = tf.tensor([Array(encodedDescription.length).fill(0)], undefined, 'int32');
    
    const bookResult = await model.execute({
      input_ids: descriptionIdsTensor,
      attention_mask: descriptionAttentionMask,
      token_type_ids: descriptionTokenTypeIds,
    });
    console.log(`Book: ${book.title}, Book result:`, bookResult);
    
    bookEmbeddings.push({ book, embedding: bookResult });
  }

  const userInputTensor = userInputResult.reshape([-1]); 
  console.log("User input tensor:", userInputTensor);

  const similarities = bookEmbeddings.map(({ book, embedding }) => {
    const bookTensor = embedding.reshape([-1]);
    const similarity = cosineSimilarity(userInputTensor, bookTensor);
    return { book, similarity };
  });
  
  similarities.sort((a, b) => b.similarity - a.similarity);
  return similarities.slice(0, 5);
}

module.exports = recomendBook;