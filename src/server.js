const Hapi = require('@hapi/hapi');
const routes = require('./route');
const Jwt = require('@hapi/jwt');
const Inert = require('@hapi/inert');


const init = async () => {
    const server = Hapi.server({
        port: 5000,
        host: 'localhost',
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
        maxAgeSec: 14400,
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