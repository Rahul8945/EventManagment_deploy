const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Event Managment App',
      version: '1.0.0',
    },
    servers:[
        {
            url:'https://localhost:8080',
            description:'Event Management App'
        }
    ]
  },
  apis: ['./routes/*.js'],
};

const openapiSpecification = swaggerJsdoc(options);
module.exports=openapiSpecification