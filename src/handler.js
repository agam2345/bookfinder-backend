const db = require('./database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const recomendBook = require('./service');


function getAllBooks(request, h){
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM buku", (err, result)=>{
            if(err){
                return reject(h.response({
                    status: "fail",
                    messgae: err.message
                }).code(500));
        }

        return resolve(h.response({
            status: 'success',
            data: result
        }).code(200));
    });
});
}


async function postRequestBooks(request, h) {
    const { genre, mood, query } = request.payload;

    try {
        const result = await recomendService.recomendBook({ genre, mood, query });
        return h.response(result).code(200);
    } catch (err) {
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
    })



}



module.exports = {getAllBooks,registerUser, login};