const mongoose=require('mongoose');

const ReviewSchema=new mongoose.Schema({
    username:{
        type:String,
        required:true
    },
    user_image:{
        type:String,
        required:true
    },
    user_review:{
        type:String,
        required:true
    }
})

ReviewSchema.set('timestamps',true);

module.exports=mongoose.model('Review', ReviewSchema);