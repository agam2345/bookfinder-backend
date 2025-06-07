const db = require('./database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const recomendBook  = require('./model-bert.js');
const rekomendasikanBuku = require('./content-base-filtering.js');

async function getAllBooks(request, h) {
    const { mood, genre } = request.query;
    console.log(genre);

    let sql = "SELECT * FROM books";
    const values = [];

    if (mood || genre) {
        sql += " WHERE";
        const conditions = [];

        if (genre) {
            conditions.push("simple_categories = $1");
            values.push(genre);
        }

        if (mood) {
            conditions.push("emotion_simple = $2");
            values.push(mood);
        }

        sql += " " + conditions.join(" OR ");
    }

    try {
        const result = await db.query(sql, values);

        return h.response({
            status: "success",
            data: result.rows
        }).code(200);

    } catch (err) {
        console.error("DB Query Error:", err);
        return h.response({
            status: "fail",
            message: err.message
        }).code(500);
    }
}

async function GetBooksByQuery(request, h) {
  const text = request.payload;
  const query = String(text?.text || '').trim();
  const authHeader = request.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  try {
    const result = await recomendBook(query, token);
    return h.response(
       {
         data: result
       }
    ).code(200);
  } catch (err) {
    console.error("Rekomendasi gagal:", err);
    return h.response({
      status: 'fail',
      message: err.message
    }).code(500);
  }
}

async function GetBooksByLastReading(request, h){
    const {title} = request.payload;
    try{
        const result = await rekomendasikanBuku(title);
        return h.response(
            {
                status: 'success',
                data : result
            }
        ).code(200);
    } catch(err){
         console.error("Rekomendasi gagal:", err);
    return h.response({
      status: 'fail',
      message: err.message
    }).code(500);

    }
}

async function registerUser(request, h) {
    const { username, email, password } = request.payload;
    const hashPassword = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO users (email, username, password) VALUES ($1, $2, $3) RETURNING *";

    try {
        const result = await db.query(sql, [email, username, hashPassword]);

        return h.response({
            status: 'success',
            message: "User registered successfully",
            data: result.rows[0]
        }).code(201);

    } catch (err) {
        return h.response({
            status: "fail",
            message: err.message
        }).code(500);
    }
}
async function login(request, h) {
    const { email, password } = request.payload;

    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email])

        if (result.length === 0) {
            return h.response({
                status: "fail",
                message: "User tidak ditemukan"
            }).code(404);
        }

        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return h.response({
                status: "fail",
                message: "Password salah"
            }).code(401);
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, username: user.username },
            'rahasia_super_aman',
            { expiresIn: '1h' }
        );

        return h.response({
            status: "success",
            data: {
                accessToken: token
            }
        }).code(200);

    } catch (err) {
        return h.response({
            status: "fail",
            message: err.message
        }).code(500);
    }
}


async function addFinishedBooks(request, h) {
    const { id: user_id } = request.auth.credentials; 
    const { book_id } = request.payload;

    const sql = `INSERT INTO finished_books (user_id, book_id) VALUES ($1, $2)`;
    const values = [user_id, book_id];

    try {
        await db.query(sql, values);

        return h.response({
            status: 'success',
            message: 'Buku ditandai selesai dibaca.'
        }).code(201);

    } catch (err) {
        return h.response({
            status: 'fail',
            message: err.message
        }).code(500);
    }
}
async function getFinishedBooks(request, h) {
    const { id: user_id } = request.auth.credentials;

    const sql = `
        SELECT fb.id AS finished_id, fb.finished_at, b.*
        FROM finished_books fb
        JOIN books b ON fb.book_id = b.id
        WHERE fb.user_id = $1
    `;

    try {
         const result = await db.query(sql, [user_id]);

        return h.response({
            status: 'success',
            data: result.rows
        }).code(200);

    } catch (err) {
        return h.response({
            status: 'fail',
            message: err.message
        }).code(500);
    }
}


async function getDetailBook(request, h){
    const { id } = request.params;
    const sql = 'SELECT * FROM books WHERE id = $1'

    try{
    const data = await db.query(sql, [id])
         return h.response({
                status: 'success',
                data : data.rows
            }).code(200);

    } catch(error){
         return h.response({
                status: 'fail',
                message : error.message
            }).code(200);

    }
}


module.exports = {getAllBooks,registerUser, login, GetBooksByQuery, GetBooksByLastReading, addFinishedBooks, getFinishedBooks, getDetailBook};