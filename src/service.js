const tf = require('@tensorflow/tfjs-node');
let tokenizerPromise = (async () => {
  const { AutoTokenizer } = await import('@xenova/transformers');
  return AutoTokenizer.from_pretrained('bert-base-uncased');
})();

// Fungsi untuk menghitung Cosine Similarity
function cosineSimilarity(a, b) {
  const dotProduct = tf.sum(tf.mul(a, b)).dataSync()[0];
  const normA = tf.norm(a).dataSync()[0];
  const normB = tf.norm(b).dataSync()[0];
  return dotProduct / (normA * normB);
}

async function recomendBook(query) {
  // 1. Tokenizer dan model
  const tokenizer = await tokenizerPromise;
  //const tokenizer = await AutoTokenizer.from_pretrained('bert-base-uncased');
  const model = await tf.loadGraphModel('http://localhost:5000/model/model.json');
  
  // 2. Input pengguna
  const inputText = query;
  
  // 3. Ambil data buku dari server
  const fetchResponse = await fetch('http://localhost:5000/books');
  const responseBooks = await fetchResponse.json();
  console.log("Response Type:", typeof(responseBooks)); // Cek tipe response
  const books = responseBooks.data;
  
  // 4. Tokenisasi input teks pengguna
  const encodedInput = await tokenizer.encode(inputText);
  const inputIdsTensor = tf.tensor([encodedInput], undefined, 'int32');
  const attentionMaskTensor = tf.tensor([Array(encodedInput.length).fill(1)], undefined, 'int32');
  const tokenTypeIdsTensor = tf.tensor([Array(encodedInput.length).fill(0)], undefined, 'int32');
  
  // 5. Dapatkan representasi input pengguna
  const userInputResult = await model.execute({
    input_ids: inputIdsTensor,
    attention_mask: attentionMaskTensor,
    token_type_ids: tokenTypeIdsTensor,
  });
  console.log("User input result:", userInputResult);
  
  // 6. Tokenisasi dan representasi deskripsi buku
  const bookEmbeddings = [];
  for (const book of books) {
    const bookDescription = book.description_cleaned;
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

  // 7. Proses tensor untuk cosine similarity
  const userInputTensor = userInputResult.reshape([-1]); // Meratakan tensor input pengguna
  console.log("User input tensor:", userInputTensor);

  // 8. Hitung similarity dan urutkan hasilnya
  const similarities = bookEmbeddings.map(({ book, embedding }) => {
    const bookTensor = embedding.reshape([-1]); // Meratakan tensor embedding buku
    const similarity = cosineSimilarity(userInputTensor, bookTensor);
    return { book, similarity };
  });
  
  // 9. Urutkan berdasarkan similarity tertinggi
  similarities.sort((a, b) => b.similarity - a.similarity);
  
  // 10. Tampilkan buku yang paling relevan
  //console.log("Buku yang paling relevan:", similarities.slice(0, 5)); // menampilkan top 1 buku
  return similarities.slice(0, 5);
}

module.exports = recomendBook;