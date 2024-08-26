const {connect}=require('mongoose')

const connectDB=async(db_url)=>{
    try {
        await connect(db_url)
    } catch (error) {
        console.log(err)
    }
}

module.exports=connectDB;