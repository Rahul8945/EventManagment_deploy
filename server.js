const express=require('express')
const dotenv=require('dotenv');
const connectDB = require('./configs/db');
const userRouter = require('./routes/userRoute');
const eventRouter = require('./routes/eventRoute');
const cors = require("cors");
const swaggerUi = require('swagger-ui-express');
 const swaggerSpec=require('./swagger/swagger');


dotenv.config()
const app=express();
app.use(express.json());
app.use(cors());

const auth = require('./middleware/auth');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/',(req,res)=>{
    res.send("this is home route")
    
    
})
app.use('/user',userRouter)
app.use('/userEvent',auth,eventRouter)

const db_url=process.env.DB_URL
const port=process.env.PORT || 9090;
app.listen(port,async()=>{
    try {
        await connectDB(db_url)
        console.log(`server is running on http://localhost:${port}`);
    } catch (error) {
        console.log(error)
    }
})