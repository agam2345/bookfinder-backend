const Hapi = require('@hapi/hapi');
const routes = require('./route');
const Jwt = require('@hapi/jwt');
const Inert = require('@hapi/inert');
require('dotenv').config();


const init = async () => {
    const server = Hapi.server({
        port: process.env.PORT || 5000,
        host: process.env.NODE_ENV !== 'production' ? 'localhost' : '0.0.0.0',
        routes:{
            cors:{
                origin: ['*']
            }
        }
    });

    await server.register([Jwt,Inert]);
    server.auth.strategy('jwt', 'jwt', {
        keys:  'rahasia_super_aman',
        verify: {
        aud: false,
        iss: false,
        sub: false,
        nbf: true,
        exp: true,
        maxAgeSec: 86400,
        timeSkewSec: 15
        },
        validate: (artifacts, request, h) => {
        return {
            isValid: true,
            credentials: artifacts.decoded.payload
        };
        }
    });
    server.auth.default('jwt');

    server.route(routes);
 
    await server.start();
    console.log(`Server berjalan pada ${server.info.uri}`);
}
init();