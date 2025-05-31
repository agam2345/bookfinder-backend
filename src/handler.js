const db = require('./database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const recomendBook  = require('./service.js');
const rekomendasikanBuku = require('./content-base-filtering.js');
const { resolve } = require('path-browserify');

function getAllBooks(request, h) {
    const { mood, genre } = request.query;
    console.log(genre)

    let sql = "SELECT * FROM books";
    const values = [];

    if (mood || genre) {
        sql += " WHERE";
        const conditions = [];

        if (genre) {
            conditions.push("simple_categories = ?");
            values.push(genre);
        }

        if (mood) {
            conditions.push("emotion_simple = ?");
            values.push(mood);
        }

        sql += " " + conditions.join(" OR ");
    }

    return new Promise((resolve, reject) => {
        db.query(sql, values, (err, result) => {
            if (err) {
                return reject(h.response({
                    status: "fail",
                    message: err.message
                }).code(500));
            }

            return resolve(h.response({
                status: "success",
                data: result
            }).code(200));
        });
    });
}

async function GetBooksByQuery(request, h) {
  const text = request.payload;
  const query = String(text?.text || '').trim();
  try {
    const result = await recomendBook(query);
    return h.response(result).code(200);
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
    const sql = "INSERT INTO user (email, username, password) VALUES (?, ?, ?)";

    try {
        const result = await new Promise((resolve, reject) => {
            db.query(sql, [email, username, hashPassword], (err, result) => {
                if (err) {
                    return reject(err);
                }
                return resolve(result);
            });
        });

        return h.response({
            status: 'success',
            message: "User registered successfully",
            data: result
        }).code(201);

    } catch (err) {
        return h.response({
            status: "fail",
            message: err.message
        }).code(500);
    }
}

function login(request, h){
    const { email, password } = request.payload;

    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM user WHERE email = ?", [email], async(err, result) => {
            if(err){
                return reject(
                    h.response({
                        status: "fail",
                        message: err.message
                    })
                );
            }
            if(result.length === 0) {
                return resolve(
                    h.response({
                        status: "fail",
                        message: "user tidak ditemukan"
                    })
                );
            }
            const user = result[0];

            const isValid = await bcrypt.compare(password, user.password);
            if(!isValid) {
                return resolve(
                    h.response({
                        status: "fail",
                        message: "password salah"
                    }).code(401)
                );
            }

            const token = jwt.sign(
                { id: user.id, email: user.emai, username: user.username},
                'rahasia_super_aman',
                {expiresIn: '1h'}
            );
            return resolve(
                h.response(
                    {
                        status: "success",
                        message: "Login berhasil",
                        token : token
                    }
                )
            )

        })
    });
}

function addFinishedBooks(request, h){
    const { id: user_id } = request.auth.credentials; 
    const { book_id } = request.payload;

    const sql = `INSERT INTO finished_books  (user_id, book_id) VALUES (?,?)`;
    const values=[user_id, book_id];

    return new Promise((resolve, reject)=>{
        db.query(sql, values, (err, result)=>{
            if(err){
                return reject(h.response({
                status: 'fail',
                message: err.message
            }).code(500));
            }
             return resolve(h.response({
             status: 'success',
             message: 'Buku ditandai selesai dibaca.'
             }).code(201));
        });
    });
}

function getFinishedBooks(request, h){
    const { id: user_id } = request.auth.credentials;
    const sql = `
            SELECT fb.id AS finished_id, fb.finished_at, b.*
            FROM finished_books fb
            JOIN books b ON fb.book_id = b.id
            WHERE fb.user_id = ?
        `;

    return new Promise((resolve, reject)=> {
        db.query(sql, user_id, (err, result) => {
              if(err){
                return reject(h.response({
                    status: 'fail',
                    message: err.message
                }).code(500));
            }
            return resolve(h.response({
                status: 'success',
                data : result
            }).code(200));
        }
        )
    })
}



module.exports = {getAllBooks,registerUser, login, GetBooksByQuery, GetBooksByLastReading, addFinishedBooks, getFinishedBooks};