const mongoose=require('mongoose');

mongoose.connect(process.env.DataBase,{
    useUnifiedTopology:true
}).then(()=>{
    console.log("Database Connected")
}).catch((e)=>{
    console.log("Error");
    throw new Error(e);
})