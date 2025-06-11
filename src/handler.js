const db = require('./database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const recomendBook  = require('./model-bert.js');
const rekomendasikanBuku = require('./content-base-filtering.js');


async function getAllBooks(request, h) {
    const { mood, genre } = request.query;

    try{
        let query = db.from('books').select('*');

        if (genre || mood) {
            if (genre && mood) {
               query = query.eq('simple_categories', genre).eq('emotion_simple', mood);
            } else if (genre) {
                query = query.eq('simple_categories', genre);
            } else if (mood) {
                query = query.eq('emotion_simple', mood);
            }
        }
        const { data, error } = await query;

        if (error) {
            return h.response({
                status: "fail",
                message: error.message
            }).code(400);
        }

        return h.response({
            status: "success",
            data: data
        }).code(200);

    } catch(err){
        return h.response({
        status: 'fail',
        message: err.message
        }).code(500);

    }
}

async function GetBooksByQuery(request, h) {
  const text = request.query;
  const query = String(text?.text || '').trim();
  const authHeader = request.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  try {
    const result = await recomendBook(query, token);
    return h.response(
       {
         status: 'success',
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
    const {title} = request.query;
    try{
        const result = await rekomendasikanBuku(title);
        if(result.length === 0){
            return h.response(
            {
                status: 'fail',
                data : "Buku tidak ditemukan"
            }
        ).code(404);

        }
        return h.response(
            {
                status: 'success',
                data: result,
            }
        ).code(200);
    } catch(err){
        return h.response({
        status: 'fail',
        message: err.message
        }).code(500);

    }
}

async function registerUser(request, h) {
    const { username, email, password } = request.payload;

     if (!username || !email || !password) {
        return h.response({
            status: "fail",
            message: "Username, email, dan password harus diisi"
        }).code(400);
    }

    if (password.length < 8) {
        return h.response({
            status: "fail",
            message: "Password minimal harus 8 karakter"
        }).code(400);
    }
    const hashPassword = await bcrypt.hash(password, 10);

    try {
        const { data, error } = await db
            .from('users')
            .insert([
                {
                    email: email,
                    username: username,
                    password: hashPassword
                }
            ])
            .single();

        
        if (error) {
            return h.response({
                status: "fail",
                message: error.message
            }).code(400);
        }

        return h.response({
            status: 'success',
            message: "User registered successfully"
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
        const { data: result, error } = await db.from('users').select('*') .eq('email', email).single();

        if (error) {
            return h.response({
                status: "fail",
                message: error.message
            }).code(400);
        }
        
        if (!result) {
            return h.response({
                status: "fail",
                message: "User tidak ditemukan"
            }).code(404);
        }

        const user = result;
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
    const { book_id , finished_at} = request.payload;

    if (!book_id || !finished_at) {
        return h.response({
            status: 'fail',
            message: 'Field book_id dan finished_at wajib diisi.'
        }).code(400);
    }

    try {
        const { data, error } = await db.from('finished_books').insert([
            { user_id: user_id, book_id: book_id ,finished_at: finished_at}
        ]);
        
        if (error) {
            return h.response({
                status: "fail",
                message: error.message
            }).code(400);
        }

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

    try {
        const { data, error } = await db
            .from('finished_books')
            .select('id, finished_at, books(*)')
            .eq('user_id', user_id);
        
        if (error) {
            return h.response({
                status: "fail",
                message: error.message
            }).code(400);
        }

        return h.response({
            status: 'success',
            data: data
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

    try{
    const {data, error} = await db.from('books').select('*').eq('id', id).single();

       if (error) {
            return h.response({
                status: "fail",
                message: `Buku dengan id ${id} tidak ditemukan`
            }).code(400);
        }
         return h.response({
                status: 'success',
                data : data
            }).code(200);

    } catch(err){
         return h.response({
                status: 'fail',
                message : err.message
            }).code(500);
    }
}


module.exports = {getAllBooks,registerUser, login, GetBooksByQuery, GetBooksByLastReading, addFinishedBooks, getFinishedBooks, getDetailBook};